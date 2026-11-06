
import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";

const validCategories = ["men", "women", "unisex"];
const validSizes = ["XS", "S", "M", "L", "XL", "XXL"];

type SizeInput = {
  size: string;
  stock_quantity: number;
};

type ColorInput = {
  color: string;
  price_paise: number;
  image_urls: string[];
  sizes: SizeInput[];
};

function isValidImageList(
  images: unknown,
  allowedPrefix: string
): images is string[] {
  return (
    Array.isArray(images) &&
    images.length <= 10 &&
    images.every((url: unknown) => {
      if (typeof url !== "string" || url.length > 2048) {
        return false;
      }

      try {
        const parsed = new URL(url);

        return (
          parsed.protocol === "https:" &&
          (url.startsWith(allowedPrefix) ||
            parsed.hostname === "images.unsplash.com")
        );
      } catch {
        return false;
      }
    })
  );
}

function isValidSizes(value: unknown): value is SizeInput[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > validSizes.length
  ) {
    return false;
  }

  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item)
    ) {
      return false;
    }

    const variant = item as Record<string, unknown>;

    if (
      typeof variant.size !== "string" ||
      !validSizes.includes(variant.size) ||
      seen.has(variant.size) ||
      typeof variant.stock_quantity !== "number" ||
      !Number.isSafeInteger(variant.stock_quantity) ||
      variant.stock_quantity < 0 ||
      variant.stock_quantity > 1000000
    ) {
      return false;
    }

    seen.add(variant.size);
  }

  return true;
}

function isValidColors(
  value: unknown,
  allowedPrefix: string
): value is ColorInput[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 20
  ) {
    return false;
  }

  const seenColors = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item)
    ) {
      return false;
    }

    const color = item as Record<string, unknown>;

    if (
      typeof color.color !== "string" ||
      !color.color.trim() ||
      color.color.trim().length > 60 ||
      seenColors.has(color.color.trim().toLowerCase()) ||
      typeof color.price_paise !== "number" ||
      !Number.isSafeInteger(color.price_paise) ||
      color.price_paise <= 0 ||
      color.price_paise > 100000000 ||
      !isValidImageList(color.image_urls, allowedPrefix) ||
      !isValidSizes(color.sizes)
    ) {
      return false;
    }

    seenColors.add(color.color.trim().toLowerCase());
  }

  return true;
}


async function checkAdmin() {
  const supabase = await createAdminServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Please sign in as an admin." },
        { status: 401 }
      ),
    };
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { supabase, response: null };
}

export async function GET() {
  const { supabase, response } = await checkAdmin();

  if (response) return response;

  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price_paise, description, active, image_urls"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product list failed:", error.message);

    return NextResponse.json(
      { error: "Could not load products." },
      { status: 500 }
    );
  }

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const { supabase, response } = await checkAdmin();

  if (response) return response;

  let productId: string | null = null;
  let createdColorIds: string[] = [];

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid product data." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const {
      name,
      category,
      description,
      active,
    } = input;

    const allowedPrefix =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/storage/v1/object/public/product-images/`;

    // New format: each color has its own price, images and sizes.
    // Legacy format: one product price, image gallery and sizes.
    let colors: ColorInput[];

    if (input.colors !== undefined) {
      if (!isValidColors(input.colors, allowedPrefix)) {
        return NextResponse.json(
          {
            error:
              "Check each color, price, image gallery, sizes and stock quantities.",
          },
          { status: 400 }
        );
      }

      colors = input.colors.map((color) => ({
        ...color,
        color: color.color.trim(),
      }));
    } else {
      const { price_paise, image_urls, sizes } = input;

      if (
        typeof price_paise !== "number" ||
        !Number.isSafeInteger(price_paise) ||
        price_paise <= 0 ||
        price_paise > 100000000 ||
        !isValidImageList(image_urls, allowedPrefix) ||
        !isValidSizes(sizes)
      ) {
        return NextResponse.json(
          { error: "Check the product price, images, sizes and quantities." },
          { status: 400 }
        );
      }

      colors = [
        {
          color: "Default",
          price_paise,
          image_urls,
          sizes,
        },
      ];
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 150 ||
      typeof category !== "string" ||
      !validCategories.includes(category) ||
      typeof description !== "string" ||
      description.length > 5000 ||
      typeof active !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Check the product name, category and description." },
        { status: 400 }
      );
    }

    const slugBase =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 150) || "product";

    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

    const firstColor = colors[0];

    // Keep legacy product fields populated for existing pages.
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        slug,
        category,
        description: description.trim(),
        price_paise: firstColor.price_paise,
        image_urls: firstColor.image_urls,
        active,
      })
      .select("id, name, slug")
      .single();

    if (productError || !product) {
      console.error("Product creation failed:", productError?.message);

      return NextResponse.json(
        { error: "Could not create the product. Check database permissions." },
        { status: 500 }
      );
    }

    productId = product.id;

    // Save each color's own price and image gallery.
    const colorRows = colors.map((color) => ({
      product_id: product.id,
      color: color.color,
      price_paise: color.price_paise,
      image_urls: color.image_urls,
    }));

    const { data: savedColors, error: colorsError } = await supabase
      .from("product_colors")
      .insert(colorRows)
      .select("id, color");

    if (colorsError || !savedColors) {
      console.error("Color creation failed:", colorsError?.message);

      await supabase.from("products").delete().eq("id", product.id);

      return NextResponse.json(
        { error: "Could not save product colors. Check database permissions." },
        { status: 500 }
      );
    }

    createdColorIds = savedColors.map((item) => item.id);

    const variants = colors.flatMap((color) => {
      const savedColor = savedColors.find(
        (item) => item.color === color.color
      );

      if (!savedColor) return [];

      return color.sizes.map((size) => ({
        product_id: product.id,
        color_id: savedColor.id,
        color: color.color,
        size: size.size,
        sku: `${slugBase}-${color.color}-${size.size}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .slice(0, 100),
        stock_quantity: size.stock_quantity,
      }));
    });

    const { error: variantsError } = await supabase
      .from("product_variants")
      .insert(variants);

    if (variantsError) {
      console.error("Variant creation failed:", variantsError.message);

      // Remove partially created data after a failed save.
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", product.id);

      await supabase
        .from("product_colors")
        .delete()
        .eq("product_id", product.id);

      await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      return NextResponse.json(
        { error: "Could not save sizes and stock. Check database permissions." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Product and color variants created successfully.",
        product,
        colors: savedColors,
        variant_count: variants.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Product API failed:", error);

    // Best-effort cleanup if an unexpected error occurs mid-save.
    if (productId) {
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

      await supabase
        .from("product_colors")
        .delete()
        .eq("product_id", productId);

      await supabase
        .from("products")
        .delete()
        .eq("id", productId);
    }

    return NextResponse.json(
      { error: "Invalid request or product could not be saved." },
      { status: 400 }
    );
  }
}

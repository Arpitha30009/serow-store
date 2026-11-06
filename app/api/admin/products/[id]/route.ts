
import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];


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

function validImageUrls(value: unknown) {
  const allowedPrefix =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/storage/v1/object/public/product-images/`;

  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every((url) => {
      if (typeof url !== "string" || url.length > 2048) return false;

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

function validPrice(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100000000
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { supabase, response: authResponse } = await checkAdmin();
  if (authResponse) return authResponse;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("id,name,description,category,price_paise,active,image_urls")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Product load failed:", error.message);
    return NextResponse.json(
      { error: "Could not load product details." },
      { status: 500 }
    );
  }

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { data: colors, error: colorsError } = await supabase
    .from("product_colors")
    .select("id,product_id,color,price_paise,image_urls,created_at")
    .eq("product_id", id)
    .order("created_at", { ascending: true });

  if (colorsError) {
    console.error("Product colors load failed:", colorsError.message);
    return NextResponse.json(
      { error: "Could not load product colors. Check database permissions." },
      { status: 500 }
    );
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id,product_id,color_id,color,size,sku,stock_quantity")
    .eq("product_id", id);

  if (variantsError) {
    console.error("Product sizes load failed:", variantsError.message);
    return NextResponse.json(
      { error: "Could not load product sizes. Check database permissions." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    product,
    colors: colors ?? [],
    variants: variants ?? [],
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { supabase, response: authResponse } = await checkAdmin();
  if (authResponse) return authResponse;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid product data." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if ("name" in input) {
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 150
    ) {
      return NextResponse.json(
        { error: "Name must be 1–150 characters." },
        { status: 400 }
      );
    }
    updates.name = input.name.trim();
  }

  if ("description" in input) {
    if (typeof input.description !== "string" || input.description.length > 5000) {
      return NextResponse.json(
        { error: "Description must be 5000 characters or fewer." },
        { status: 400 }
      );
    }
    updates.description = input.description.trim();
  }

  if ("category" in input) {
    if (!["men", "women", "unisex"].includes(input.category as string)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    updates.category = input.category;
  }

  if ("active" in input) {
    if (typeof input.active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid visibility status." },
        { status: 400 }
      );
    }
    updates.active = input.active;
  }

  // Keep compatibility with older single-color requests.
  if ("price_paise" in input) {
    if (!validPrice(input.price_paise)) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }
    updates.price_paise = input.price_paise;
  }

  if ("image_urls" in input) {
    if (!validImageUrls(input.image_urls)) {
      return NextResponse.json(
        { error: "Invalid product image URLs. Maximum 10 images allowed." },
        { status: 400 }
      );
    }
    updates.image_urls = input.image_urls;
  }

  const submittedColors = input.colors;

  if (submittedColors !== undefined) {
    if (!Array.isArray(submittedColors) || submittedColors.length < 1 || submittedColors.length > 20) {
      return NextResponse.json(
        { error: "A product must have between 1 and 20 colors." },
        { status: 400 }
      );
    }

    const names = new Set<string>();

    for (const entry of submittedColors) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        return NextResponse.json({ error: "Invalid color data." }, { status: 400 });
      }

      const color = entry as Record<string, unknown>;

      if (
        typeof color.color !== "string" ||
        !color.color.trim() ||
        color.color.trim().length > 60
      ) {
        return NextResponse.json({ error: "Each color needs a valid name." }, { status: 400 });
      }

      const normalized = color.color.trim().toLowerCase();
      if (names.has(normalized)) {
        return NextResponse.json(
          { error: "Color names must be unique within a product." },
          { status: 400 }
        );
      }
      names.add(normalized);

      if (!validPrice(color.price_paise)) {
        return NextResponse.json(
          { error: `Enter a valid price for ${color.color}.` },
          { status: 400 }
        );
      }

      if (!validImageUrls(color.image_urls)) {
        return NextResponse.json(
          { error: `Invalid images for ${color.color}. Maximum 10 images allowed.` },
          { status: 400 }
        );
      }

      if (!Array.isArray(color.sizes) || color.sizes.length > VALID_SIZES.length) {
        return NextResponse.json(
          { error: `Invalid sizes for ${color.color}.` },
          { status: 400 }
        );
      }

      const submittedSizes = new Set<string>();
      for (const sizeEntry of color.sizes) {
        if (typeof sizeEntry !== "object" || sizeEntry === null || Array.isArray(sizeEntry)) {
          return NextResponse.json({ error: "Invalid size data." }, { status: 400 });
        }

        const size = sizeEntry as Record<string, unknown>;
        if (
          typeof size.size !== "string" ||
          !VALID_SIZES.includes(size.size) ||
          submittedSizes.has(size.size) ||
          typeof size.stock_quantity !== "number" ||
          !Number.isSafeInteger(size.stock_quantity) ||
          size.stock_quantity < 0 ||
          size.stock_quantity > 1000000
        ) {
          return NextResponse.json(
            { error: `Invalid size or stock quantity for ${color.color}.` },
            { status: 400 }
          );
        }
        submittedSizes.add(size.size);
      }

      if (color.id !== undefined && color.id !== null &&
          (typeof color.id !== "string" || !UUID_PATTERN.test(color.id))) {
        return NextResponse.json({ error: "Invalid color ID." }, { status: 400 });
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !updatedProduct) {
      console.error("Product update failed:", error?.message);
      return NextResponse.json(
        { error: "Could not update product. Check database permissions." },
        { status: 500 }
      );
    }
  }

  if (Array.isArray(submittedColors)) {
    for (const entry of submittedColors) {
      const color = entry as {
        id?: string;
        color: string;
        price_paise: number;
        image_urls: string[];
        sizes: { id?: string; size: string; stock_quantity: number }[];
      };

      let colorId = color.id;

      if (colorId) {
        const { data: existingColor, error: lookupError } = await supabase
          .from("product_colors")
          .select("id")
          .eq("id", colorId)
          .eq("product_id", id)
          .maybeSingle();

        if (lookupError || !existingColor) {
          return NextResponse.json(
            { error: "One of the selected colors could not be found." },
            { status: 400 }
          );
        }

        const { error: colorUpdateError } = await supabase
          .from("product_colors")
          .update({
            color: color.color.trim(),
            price_paise: color.price_paise,
            image_urls: color.image_urls,
          })
          .eq("id", colorId)
          .eq("product_id", id);

        if (colorUpdateError) {
          console.error("Color update failed:", colorUpdateError.message);
          return NextResponse.json(
            { error: `Could not update color ${color.color}.` },
            { status: 500 }
          );
        }
      } else {
        const { data: newColor, error: colorInsertError } = await supabase
          .from("product_colors")
          .insert({
            product_id: id,
            color: color.color.trim(),
            price_paise: color.price_paise,
            image_urls: color.image_urls,
          })
          .select("id")
          .single();

        if (colorInsertError || !newColor) {
          console.error("Color insert failed:", colorInsertError?.message);
          return NextResponse.json(
            { error: `Could not add color ${color.color}. Check product_colors permissions.` },
            { status: 500 }
          );
        }

        colorId = newColor.id;
      }

      const { data: existingVariants, error: variantsLookupError } = await supabase
        .from("product_variants")
        .select("id,size,color")
        .eq("product_id", id)
        .eq("color_id", colorId);

      if (variantsLookupError) {
        console.error("Variant lookup failed:", variantsLookupError.message);
        return NextResponse.json(
          { error: `Could not load sizes for ${color.color}.` },
          { status: 500 }
        );
      }

      for (const size of color.sizes) {
        const existingVariant = (existingVariants ?? []).find(
          (variant) => variant.size === size.size
        );

        if (existingVariant) {
          const { error: variantUpdateError } = await supabase
            .from("product_variants")
            .update({
              stock_quantity: size.stock_quantity,
              color: color.color.trim(),
            })
            .eq("id", existingVariant.id)
            .eq("product_id", id);

          if (variantUpdateError) {
            console.error("Variant update failed:", variantUpdateError.message);
            return NextResponse.json(
              { error: `Could not update stock for ${color.color} / ${size.size}.` },
              { status: 500 }
            );
          }
        } else {
          const sku =
            `${id.slice(0, 8)}-${color.color.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${size.size}`;

          const { error: variantInsertError } = await supabase
            .from("product_variants")
            .insert({
              product_id: id,
              color_id: colorId,
              color: color.color.trim(),
              size: size.size,
              sku,
              stock_quantity: size.stock_quantity,
            });

          if (variantInsertError) {
            console.error("Variant insert failed:", variantInsertError.message);
            return NextResponse.json(
              { error: `Could not add size ${size.size} for ${color.color}.` },
              { status: 500 }
            );
          }
        }
      }
    }

    // Keep legacy product fields aligned with the first color for older storefront code.
    const firstColor = submittedColors[0] as {
      price_paise: number;
      image_urls: string[];
    };

    const { error: legacyUpdateError } = await supabase
      .from("products")
      .update({
        price_paise: firstColor.price_paise,
        image_urls: firstColor.image_urls,
      })
      .eq("id", id);

    if (legacyUpdateError) {
      console.error("Legacy product fields update failed:", legacyUpdateError.message);
      return NextResponse.json(
        { error: "Colors saved, but the default product details could not be updated." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, message: "Product updated successfully." });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supabase, response: authResponse } = await checkAdmin();
  if (authResponse) return authResponse;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();

  if (productError) {
    console.error("Product lookup before deletion failed:", productError.message);
    return NextResponse.json(
      { error: "Could not find the product. Check database permissions." },
      { status: 500 }
    );
  }

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { error: variantsError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", id);

  if (variantsError) {
    console.error("Variant deletion failed:", variantsError.message);
    return NextResponse.json(
      { error: "Could not delete product sizes. Check product_variants DELETE permissions." },
      { status: 500 }
    );
  }

  const { data: deletedProduct, error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedProduct) {
    console.error("Product deletion failed:", deleteError?.message);
    return NextResponse.json(
      { error: "Could not delete the product. Check products DELETE permissions." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${product.name} was deleted successfully.`,
  });
}


import { createClient } from "./server";

export type ProductColor = {
  id: string;
  color: string;
  price: number;
  images: string[];
  sizes: string[];
  stockBySize: Record<string, number>;
};

export type Product = {
  id: string;
  name: string;
  category: "Women" | "Men";
  type: string;
  price: number;
  oldPrice?: number;
  color: string;
  colors: ProductColor[];
  sizes: string[];
  image: string;
  images: string[];
  tag?: string;
  description: string;
  stockBySize: Record<string, number>;
};

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("products")
    .select(
      "id, name, description, category, price_paise, image_urls, active"
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch products:", error.message);
    return [];
  }

  if (!rows?.length) return [];

  const ids = rows.map((p) => p.id);

  const [
    { data: colorRows, error: colorError },
    { data: variants, error: variantError },
  ] = await Promise.all([
    supabase
      .from("product_colors")
      .select("id, product_id, color, price_paise, image_urls")
      .in("product_id", ids),

    supabase
      .from("product_variants")
      .select("product_id, color_id, size, color, stock_quantity")
      .in("product_id", ids),
  ]);

  if (colorError) {
    console.error("Failed to fetch product colors:", colorError.message);
    return [];
  }

  if (variantError) {
    console.error("Failed to fetch variants:", variantError.message);
    return [];
  }

  return rows.map((p) => {
    const productVariants = (variants ?? []).filter(
      (v) => v.product_id === p.id
    );

    const productColors = (colorRows ?? [])
      .filter((c) => c.product_id === p.id)
      .map((c) => {
        const colorVariants = productVariants.filter(
          (v) => v.color_id === c.id
        );

        const stockBySize = Object.fromEntries(
          colorVariants.map((v) => [v.size, v.stock_quantity])
        ) as Record<string, number>;

        return {
          id: c.id,
          color: c.color,
          price: c.price_paise / 100,
          images:
            c.image_urls?.length > 0
              ? c.image_urls
              : p.image_urls ?? [],
          sizes: [...new Set(colorVariants.map((v) => v.size))],
          stockBySize,
        };
      });

    // Compatibility with products created before color options were added.
    if (productColors.length === 0) {
      const stockBySize = Object.fromEntries(
        productVariants.map((v) => [v.size, v.stock_quantity])
      ) as Record<string, number>;

      const fallbackColor = productVariants[0]?.color ?? "";

      productColors.push({
        id: `legacy-${p.id}`,
        color: fallbackColor,
        price: p.price_paise / 100,
        images: p.image_urls ?? [],
        sizes: [...new Set(productVariants.map((v) => v.size))],
        stockBySize,
      });
    }

    const nameLower = p.name.toLowerCase();

    const type = nameLower.includes("shirt")
      ? "Shirts"
      : nameLower.includes("trouser") || nameLower.includes("pants")
        ? "Trousers"
        : nameLower.includes("tee")
          ? "T-shirts"
          : "Outerwear";

    const firstColor = productColors[0];

    return {
      id: p.id,
      name: p.name,
      category: p.category === "women" ? "Women" : "Men",
      type,
      price: firstColor.price,
      color: firstColor.color,
      colors: productColors,
      sizes: firstColor.sizes,
      stockBySize: firstColor.stockBySize,
      images: firstColor.images,
      image: firstColor.images[0] ?? "",
      description: p.description ?? "",
    };
  });
}

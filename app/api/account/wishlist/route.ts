import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

// GET — Fetch the signed-in customer's wishlist.
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view your wishlist." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select(`
        id,
        product_id,
        created_at,
        products (
          id,
          name,
          slug,
          description,
          category,
          price_paise,
          image_urls,
          active
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Wishlist fetch error:", error.message);
      return NextResponse.json(
        { error: "Could not load your wishlist." },
        { status: 500 }
      );
    }

    return NextResponse.json({ wishlist: data ?? [] });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

// POST — Add a product to the wishlist.
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to save wishlist items." },
        { status: 401 }
      );
    }

    let body: { productId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const productId = body.productId;

    if (
      typeof productId !== "string" ||
      !UUID_REGEX.test(productId)
    ) {
      return NextResponse.json(
        { error: "A valid product ID is required." },
        { status: 400 }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("active", true)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found or unavailable." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("wishlists")
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
        },
        { onConflict: "user_id,product_id", ignoreDuplicates: true }
      );

    if (error) {
      console.error("Wishlist add error:", error.message);
      return NextResponse.json(
        { error: "Could not add this product to your wishlist." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

// DELETE — Remove a product from the wishlist.
export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to manage your wishlist." },
        { status: 401 }
      );
    }

    let body: { productId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const productId = body.productId;

    if (
      typeof productId !== "string" ||
      !UUID_REGEX.test(productId)
    ) {
      return NextResponse.json(
        { error: "A valid product ID is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (error) {
      console.error("Wishlist remove error:", error.message);
      return NextResponse.json(
        { error: "Could not remove this product." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

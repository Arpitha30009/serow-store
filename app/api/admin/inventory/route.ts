
import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";

export async function GET() {
  const supabase = await createAdminServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      size,
      color,
      sku,
      stock_quantity,
      products (
        name,
        active
      )
    `)
    .order("size", { ascending: true });

  if (error) {
    console.error("Inventory fetch failed:", error.message);
    return NextResponse.json(
      { error: "Could not load inventory." },
      { status: 500 }
    );
  }

  return NextResponse.json({ inventory: data });
}

export async function PATCH(request: Request) {
  const supabase = await createAdminServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid inventory data." },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id) ||
    typeof input.stock_quantity !== "number" ||
    !Number.isSafeInteger(input.stock_quantity) ||
    input.stock_quantity < 0 ||
    input.stock_quantity > 1000000
  ) {
    return NextResponse.json(
      { error: "Enter a valid stock quantity." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: input.stock_quantity })
    .eq("id", input.id)
    .select("id, stock_quantity")
    .maybeSingle();

  if (error) {
    console.error("Inventory update failed:", error.message);
    return NextResponse.json(
      { error: "Could not update stock." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Variant not found or update not permitted." },
      { status: 404 }
    );
  }

  return NextResponse.json({ variant: data });
}

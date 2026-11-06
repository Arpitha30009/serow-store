import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

async function getAuthorizedAdmin() {
  const supabase = await createAdminServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Please log in as an admin." },
        { status: 401 }
      ),
    };
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !admin) {
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
  const { supabase, response } = await getAuthorizedAdmin();

  if (response) return response;

  const { data, error } = await supabase
    .from("store_announcement")
    .select("message, is_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Admin announcement fetch error:", error.message);

    return NextResponse.json(
      { error: "Unable to load announcement settings." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    data ?? {
      message: "QUIET LUXURY · TIMELESS STYLE",
      is_enabled: true,
    }
  );
}

export async function PATCH(request: Request) {
  const { supabase, response } = await getAuthorizedAdmin();

  if (response) return response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    !("is_enabled" in body)
  ) {
    return NextResponse.json(
      { error: "Message and enabled status are required." },
      { status: 400 }
    );
  }

  const { message, is_enabled } = body as {
    message: unknown;
    is_enabled: unknown;
  };

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.trim().length > 200
  ) {
    return NextResponse.json(
      { error: "Enter a message between 1 and 200 characters." },
      { status: 400 }
    );
  }

  if (typeof is_enabled !== "boolean") {
    return NextResponse.json(
      { error: "Enabled status must be true or false." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("store_announcement")
    .upsert(
      {
        id: 1,
        message: message.trim(),
        is_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("message, is_enabled")
    .single();

  if (error) {
    console.error("Announcement save error:", error.message);

    return NextResponse.json(
      { error: "Could not save announcement. Check Supabase permissions." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    announcement: data,
  });
}
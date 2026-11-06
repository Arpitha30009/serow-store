import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("store_announcement")
      .select("message, is_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Announcement fetch error:", error.message);

      return NextResponse.json(
        { error: "Unable to load announcement" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      data ?? {
        message: "QUIET LUXURY · TIMELESS STYLE",
        is_enabled: true,
      }
    );
  } catch (error) {
    console.error("Announcement API error:", error);

    return NextResponse.json(
      { error: "Unable to load announcement" },
      { status: 500 }
    );
  }
}
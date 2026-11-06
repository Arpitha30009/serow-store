
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("products")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { connected: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      message: "Supabase connection successful",
    });
  } catch {
    return NextResponse.json(
      { connected: false, message: "Connection test failed" },
      { status: 500 }
    );
  }
}

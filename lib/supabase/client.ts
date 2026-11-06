
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        name: "serow-customer-auth",
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      isSingleton: false,
    }
  );
}

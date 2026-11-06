
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const sessionNames = [
    "serow-customer-auth",
    "serow-admin-auth",
  ];

  const refreshedCookies = new Map<
    string,
    { name: string; value: string; options?: Record<string, unknown> }
  >();

  for (const cookieName of sessionNames) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookieOptions: {
          name: cookieName,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });

            cookiesToSet.forEach((cookie) => {
              refreshedCookies.set(cookie.name, cookie);
            });

            response = NextResponse.next({ request });

            refreshedCookies.forEach(
              ({ name, value, options }) => {
                response.cookies.set(
                  name,
                  value,
                  options as any
                );
              }
            );
          },
        },
      }
    );

    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

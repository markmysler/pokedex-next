import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renamed Middleware to Proxy (same functionality, new file/export
// name) — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
//
// Login is required app-wide (see upgrades/01-auth.md) — this is the one
// gate that enforces it. It also refreshes the Supabase Auth session cookie
// on every request (the standard @supabase/ssr pattern for Next.js), so
// server-side reads of the session (lib/session.ts) always see a valid,
// non-expired token without every Route Handler having to refresh it itself.
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() (not getSession()) revalidates the JWT against the Supabase
  // Auth server rather than trusting the cookie payload outright.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets/images, so page loads and API
    // calls always see a fresh session — but skip Next's internals and
    // sprite gifs.
    "/((?!_next/static|_next/image|images/|favicon.ico).*)",
  ],
};

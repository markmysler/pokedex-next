import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANON_ID_COOKIE } from "@/lib/session";

// Next.js 16 renamed Middleware to Proxy (same functionality, new file/export
// name) — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
//
// Ensures every visitor has a random anon_id before any page or API route
// runs. This is the one identity mechanism for the whole app: it's the key
// for a browser's Pokedex data in Supabase, AND it doubles as each player's
// random id in online battle rooms (no separate id generation needed there).
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(ANON_ID_COOKIE)?.value;
  if (existing) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(ANON_ID_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets/images, so page loads and API
    // calls always have anon_id — but skip Next's internals and sprite gifs.
    "/((?!_next/static|_next/image|images/|favicon.ico).*)",
  ],
};

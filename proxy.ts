import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, hasLocale, LOCALES, stripLocale, type Locale } from "@/lib/i18n/locale";

// Next.js 16 renamed Middleware to Proxy (same functionality, new file/export
// name) — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
//
// Login is required app-wide (see upgrades/01-auth.md) — this is the one
// gate that enforces it. It also refreshes the Supabase Auth session cookie
// on every request (the standard @supabase/ssr pattern for Next.js), so
// server-side reads of the session (lib/session.ts) always see a valid,
// non-expired token without every Route Handler having to refresh it itself.
//
// Also handles locale-segment redirects (upgrades/53-i18n-routing-and-
// toggle-infrastructure.md) — merged into this same function rather than a
// second proxy, with careful ordering: the locale redirect runs first (a
// path with no locale segment yet can't be auth-checked against the right
// post-redirect shape), then the existing auth-gate logic runs against the
// now-guaranteed-prefixed path. app/api/** never gets a locale segment
// (Route Handlers don't render user-facing text) and is excluded from the
// locale-redirect branch entirely, but still goes through the existing
// session-refresh/auth-gate logic below, unchanged.
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function pathnameHasLocale(pathname: string): boolean {
  return LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

// Minimal hand-rolled Accept-Language match (project's own "no UI library,
// hand-rolled" philosophy extended to i18n matching, per upgrades/53's own
// plan) rather than pulling in @formatjs/intl-localematcher + negotiator
// for a 2-locale app. Good enough for "es-AR/es-ES/es-MX/es -> es-AR,
// anything en-* -> en, everything else -> default".
function matchAcceptLanguage(header: string): Locale | null {
  const preferences = header
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase())
    .filter(Boolean);
  for (const pref of preferences) {
    if (pref.startsWith("es")) return "es-AR";
    if (pref.startsWith("en")) return "en";
  }
  return null;
}

// Precedence per upgrades/main.md's key decisions: existing URL segment (the
// caller already checked pathnameHasLocale before calling this) -> mirrored
// cookie -> Accept-Language -> default.
function resolveLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("lang")?.value;
  if (cookieLocale && hasLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const matched = matchAcceptLanguage(acceptLanguage);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api") && !pathnameHasLocale(pathname)) {
    const locale = resolveLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

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

  // By this point pathname is either /api/... (no locale segment at all) or
  // already locale-prefixed (the branch above already redirected anything
  // else) — isPublicPath needs the locale-independent shape to match
  // "/login"/"/signup" correctly either way, and the redirects below need
  // to preserve whatever locale the user is already in rather than
  // resetting to the default.
  const localePath = stripLocale(pathname);
  const locale = pathname.startsWith("/api") ? resolveLocale(request) : (pathname.split("/")[1] as Locale);

  if (!user && !isPublicPath(localePath)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath(localePath)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
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

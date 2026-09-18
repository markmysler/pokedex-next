// Shared by both server (proxy.ts, app/[lang]/**) and client code
// (components that can't use next/root-params) -- see
// upgrades/53-i18n-routing-and-toggle-infrastructure.md. Deliberately no
// "server-only" guard: this file has no server-only capability, just plain
// string logic either side can run.

export const LOCALES = ["en", "es-AR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Same name/shape as the docs' own pattern
// (node_modules/next/dist/docs/01-app/02-guides/internationalization.md)
// so it reads as the same idiom wherever it's used.
export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

// Strips a leading /en or /es-AR segment from a pathname, returning the
// locale-independent path ("/en/dashboard" -> "/dashboard", "/en" -> "/").
// Used both for "is this nav link active" comparisons and inside
// withLocale() below, so a path is never accidentally double-prefixed.
export function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

// Reads the locale segment directly off a pathname (Client Components use
// this via usePathname() -- they can't call next/root-params). Falls back
// to the default if the pathname somehow isn't locale-prefixed yet (should
// only happen for a brief instant before proxy.ts's redirect lands).
export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1] ?? "";
  return hasLocale(segment) ? segment : DEFAULT_LOCALE;
}

// Prefixes a bare app path ("/dashboard", "/online?code=ABC123") with a
// locale -- every href/router.push target in this app is one of these,
// never an external URL. A no-op if `path` is already locale-prefixed, so
// callers that might receive an already-prefixed value (e.g. the "next"
// search param proxy.ts sets on a login redirect) can pass it through
// unconditionally without double-prefixing.
export function withLocale(locale: Locale, path: string): string {
  const segment = path.split("/")[1]?.split("?")[0] ?? "";
  if (hasLocale(segment)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

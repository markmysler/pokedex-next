# Step 53: i18n — `app/[lang]/` routing + dictionary infrastructure + toggle

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

No dependency on the evolution/psychic-counterplay slice (steps 48-52) —
could ship independently — but every i18n *content* step (54-57) needs the
routing, dictionary loader, and toggle built here before there's anything
to translate strings inside of. Ordered after 48-52 in the wave specifically
so those steps' final strings (the Evolve UI, the 6 new species' names)
only need translating once, not twice.

## What changes

### Why path-based routing, not a client-only toggle

This Next version's own docs
(`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`)
push `app/[lang]/` URL-segment routing with `next/root-params` as the
canonical pattern. Confirmed directly with the user over a client-only
localStorage toggle specifically because most page text renders in **Server
Components** — `DashboardPage` (`app/(app)/dashboard/page.tsx`) was checked
directly during planning and confirmed to render literal English JSX
server-side, not delegate everything to a client child. A pure localStorage
toggle can't reach that text without either a hydration flash or moving all
of it into Client Components — path-based routing avoids both.

### Route restructure

Every route under `app/` moves under `app/[lang]/`:

- `app/page.tsx`, `app/login/`, `app/signup/` → `app/[lang]/page.tsx`,
  `app/[lang]/login/`, `app/[lang]/signup/`
- `app/(app)/*` (all 11 authenticated routes) → `app/[lang]/(app)/*`
- `app/layout.tsx` (root layout) → `app/[lang]/layout.tsx`, reading `lang`
  from `params` (or via `next/root-params` deeper in the tree) and setting
  `<html lang={lang}>`.
- `app/api/**` is **not** nested under `[lang]` — Route Handlers don't need
  a locale segment, and nothing in the API layer renders user-facing text
  directly (errors are already generic JSON, not localized copy).

Supported locales: `en`, `es-AR` (the latter carrying real `vos`/`che`
register per the user's explicit framing during planning, not neutral
Latin American Spanish).

### Dictionaries

Hand-rolled, matching this project's existing "no UI library" philosophy —
not pulling in `next-intl` or similar for a 2-locale, non-SEO-driven app.
`lib/i18n/dictionaries/en.ts` and `lib/i18n/dictionaries/es-AR.ts`, each a
nested object keyed by screen/component (following the same 4-cluster split
`design/REDESIGN_TRACKER.md` already uses, since steps 54-57 fill these in
per-cluster). `lib/i18n/getDictionary.ts` follows the docs' own
`getDictionary(locale)` pattern (dynamic import per locale, typed via
`keyof typeof dictionaries`).

### Locale resolution (`proxy.ts`)

Merged into the *existing* auth-gate proxy function (`proxy.ts` already
handles login-required redirects and Supabase session refresh) — careful
ordering: locale redirect must run before the auth check, but the auth
check still needs to apply to the now-prefixed path.

Precedence, per `main.md`'s key decisions:
1. Existing `/en` or `/es-AR` URL segment (no redirect needed).
2. A mirrored cookie (`lang=es-AR`), set whenever the toggle changes — this
   is the localStorage preference's server-readable twin, since `proxy.ts`
   can't read `localStorage`.
3. `Accept-Language` header (via `@formatjs/intl-localematcher`/
   `negotiator`, per the docs' own suggested libraries, or an equivalent
   minimal hand-rolled match — implementation's call).
4. Default `en`.

### The toggle (`components/nav/SideNav.tsx`)

Same `theme-row` pattern as the existing Sound toggle, in the same
`accountBlock` — a 2-state switch (EN/ES) instead of a mute button.
Clicking it:
1. Writes the choice to `localStorage` (the user's explicit ask).
2. Sets the mirrored cookie (`document.cookie = "lang=..."`, `path=/`,
   long `max-age`, `SameSite=Lax` — same shape the Next docs' own theme
   example uses).
3. Navigates to the same route with the URL segment swapped (e.g.
   `/en/dashboard` → `/es-AR/dashboard`) so the Server Component tree
   re-renders in the new language immediately, no full reload needed.

Per the flash-prevention guide
(`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-
hydration.md`): since the locale is resolved from the URL segment itself
(not read client-side after the fact), there's no flash-of-wrong-language
to correct for on a hard navigation — the inline-script technique that
guide describes for theme/localStorage is for values *unavailable* at SSR
time; here the locale is already in the URL the server rendered from.

### `next/root-params` for deep reads

Per the docs' "sharing the locale across your app" section — data-fetching
utilities in `lib/` that need the current locale (if any end up needing
translated content, e.g. a localized species name — not currently planned,
species names stay in English/their existing form) read it via
`next/root-params` rather than prop-drilling `lang` through every layer.

### What does NOT change in this step

- No actual translated strings yet — every dictionary starts as
  English-only (`es-AR` a stub or straight copy), filled in by steps 54-57.
- `app/api/**` routes and their error messages are untouched.

## End state

- [ ] Every route lives under `app/[lang]/`, `[lang]` constrained to `en` |
      `es-AR` (404 via `notFound()` for anything else, per the docs'
      `hasLocale` pattern).
- [ ] `proxy.ts`'s existing auth-gate logic still works unchanged, now
      layered with locale-segment redirect/detection using the precedence
      above.
- [ ] `lib/i18n/` dictionary loader + typed `Locale` union exist; both
      locale dictionaries exist (content still English-only in both at this
      stage).
- [ ] `SideNav`'s account block has a working EN/ES toggle: persists to
      `localStorage` + mirrored cookie, navigates to the swapped-locale
      version of the current route.
- [ ] A fresh visit with no prior cookie/localStorage picks a locale via
      `Accept-Language`, falling back to `en`.
- [ ] `npm run build` / `npm run lint` clean — expect every internal
      `<Link href="/...">`/`redirect()`/`router.push()` call across the ~31
      component files to need a locale-aware update (either a shared
      lang-aware `Link` wrapper or explicit prefixing) — this is the bulk
      of this step's real diff.

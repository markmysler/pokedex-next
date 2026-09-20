# Step 53: i18n — `app/[lang]/` routing + dictionary infrastructure + toggle

**Status: shipped.** See `main.md`'s "Evolution, Psychic counterplay,
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

- [x] Every route lives under `app/[lang]/`, `[lang]` constrained to `en` |
      `es-AR` (404 via `notFound()` for anything else, per the docs'
      `hasLocale` pattern).
- [x] `proxy.ts`'s existing auth-gate logic still works unchanged, now
      layered with locale-segment redirect/detection using the precedence
      above.
- [x] `lib/i18n/` dictionary loader + typed `Locale` union exist; both
      locale dictionaries exist (content still English-only in both at this
      stage).
- [x] `SideNav`'s account block has a working EN/ES toggle: persists to
      `localStorage` + mirrored cookie, navigates to the swapped-locale
      version of the current route.
- [x] A fresh visit with no prior cookie/localStorage picks a locale via
      `Accept-Language`, falling back to `en`.
- [x] `npm run build` / `npm run lint` clean — expect every internal
      `<Link href="/...">`/`redirect()`/`router.push()` call across the ~31
      component files to need a locale-aware update (either a shared
      lang-aware `Link` wrapper or explicit prefixing) — this is the bulk
      of this step's real diff.

## What actually happened

Implemented and validated on `v7`. The actual navigation-call-site count
was smaller than the plan's ~31-file estimate: a full-repo grep for
`next/link`, `redirect(`, and `router.push`/`router.replace` found 14
unique files, all handled below.

### Route restructure

`git mv` for every route (preserves history/blame): `app/page.tsx`,
`app/layout.tsx`, `app/login/`, `app/signup/`, and all of `app/(app)/*` →
under `app/[lang]/`. `app/api/**` untouched, as planned. `app/globals.css`
and `app/favicon.ico` stay at the true `app/` root (favicon resolution and
the stylesheet import don't need per-locale duplication) — `app/[lang]/
layout.tsx` imports `"../globals.css"` instead of `"./globals.css"`.

`app/[lang]/layout.tsx`: added `generateStaticParams()` (returns both
locales) and the docs' `hasLocale(lang) -> notFound()` guard. Worth noting
for whoever reads this later: given `proxy.ts`'s redirect below always
resolves and prepends a *real* locale before a request can reach any page
(an unrecognized segment like `/fr/dashboard` gets treated as "no locale
yet" and becomes `/en/fr/dashboard`, which then 404s via normal
route-not-found, never via this guard), this `notFound()` check is
effectively unreachable through normal browser navigation in this app's
specific setup — kept anyway since it's the documented pattern, costs
nothing, and is real defense-in-depth against the matcher config changing
or some other future access path.

### Two navigation conventions, split by component type

- **Server Components/pages**: read the locale via `next/root-params`
  (`const currentLang = await lang();`) and build hrefs directly
  (`` `/${currentLang}/inventory` ``) — no wrapper needed, this is free.
  Touched: `app/[lang]/page.tsx`, `app/[lang]/(app)/layout.tsx` (both had a
  bare `redirect()`), `app/[lang]/(app)/dashboard/page.tsx` (3 hrefs),
  `app/[lang]/(app)/friends/[id]/page.tsx` (1 href, plus its
  `PageProps<"/friends/[id]">` type updated to `PageProps<"/[lang]/
  friends/[id]">`), `app/[lang]/(app)/notifications/page.tsx` (1
  dynamically-built href from `renderNotification()`'s return value).
- **Client Components**: can't call `next/root-params`, so a new
  `components/LocaleLink.tsx` wraps `next/link`, reading the locale off
  `usePathname()` (always correct once `proxy.ts` has redirected, which is
  always true by the time a Client Component mounts) and prefixing
  `string` hrefs automatically. Every plain `<Link href="/...">` JSX in a
  Client Component needed zero changes beyond swapping the import to this
  wrapper: `app/[lang]/login/page.tsx`, `app/[lang]/signup/page.tsx`,
  `components/friends/FriendChatPageClient.tsx`, `components/friends/
  FriendsPageClient.tsx`, `components/nav/SideNav.tsx`.
- **`router.push`/`router.replace` call sites** (Client Components):
  compute `localeFromPathname(usePathname())` once, then wrap the target
  path in `withLocale(locale, path)` at the call site — no new hook,
  reusing the same two functions `LocaleLink` uses internally. `withLocale`
  is a no-op on an already-prefixed path, so it's always safe to call even
  on a value that *might* already carry a locale (e.g. login's `next`
  search param, which comes from `proxy.ts` already locale-prefixed).
  Touched: `app/[lang]/login/page.tsx`, `app/[lang]/signup/page.tsx`,
  `components/auth/SignOutButton.tsx`, `components/friends/
  FriendsPageClient.tsx`, `components/friends/FriendNotifications.tsx` (2
  call sites, `locale` threaded as a new prop into its two toast
  sub-components alongside the existing `router` prop), `components/
  notifications/BattleInviteAcceptButton.tsx`. One file needed *no* change
  despite matching the original grep: `components/onboarding/
  WelcomeDialog.tsx`'s `router.replace(pathname, ...)` just echoes back
  the current (already locale-prefixed) pathname to strip a query param —
  never constructs a new path, so nothing to prefix.
- **`SideNav.tsx`'s "active link" comparison** needed its own fix beyond
  the import swap: `pathname === link.href` broke once `pathname` started
  carrying a locale prefix while `LINKS` still holds bare paths — now
  compares against `stripLocale(pathname)` instead (3 call sites).

### `proxy.ts`

Locale redirect runs first, before the existing auth/session logic, and
is skipped entirely for `/api/**` (no locale segment, unchanged behavior).
Precedence implemented as planned: URL segment → `lang` cookie →
`Accept-Language` → `en` default. The `Accept-Language` match is a
~15-line hand-rolled parser (split by `,`/`;q=`, prefix-match `es*`/`en*`)
rather than pulling in `@formatjs/intl-localematcher` + `negotiator` for a
2-locale app — consistent with this project's existing "no UI library,
hand-rolled" philosophy. The existing auth-gate logic (`isPublicPath`,
the two redirect branches) now operates on `stripLocale(pathname)` for
matching and reads the locale straight off the (by then guaranteed
locale-prefixed, or `/api/...`) pathname to build locale-preserving
redirect targets, so a logged-out visit to `/es-AR/inventory` correctly
redirects to `/es-AR/login?next=%2Fes-AR%2Finventory`, not back to `/en/...`.

### The toggle (`SideNav.tsx`)

Same `theme-row` pattern as Theme/Sound, a checkbox+slider 2-state switch
(EN/ES) rather than Sound's button style — closer to Theme's own binary
switch shape. `toggleLanguage()` writes `localStorage` (wrapped in
try/catch — unavailable in some private browsing contexts, non-fatal
since the cookie still works), sets the `lang` cookie
(`path=/; max-age=31536000; SameSite=Lax`), then `router.push()`s to the
same route with the segment swapped. No flash-prevention inline script
needed, confirmed per the plan's own reasoning: the locale is already in
the URL the server rendered from, not a value read client-side after the
fact.

### Dictionaries

`lib/i18n/dictionaries/{en,es-AR}.ts`, structured by the 4
`design/REDESIGN_TRACKER.md` clusters (account/collection/battle/social),
each currently a placeholder object proving the shape — no real content
yet, `es-AR` is a literal copy of `en`, per plan. `lib/i18n/
getDictionary.ts` follows the docs' pattern exactly, reading the locale via
`next/root-params` internally rather than requiring every caller to pass
it down.

### Validation performed (real HTTP against a running `next start` server)

- `rm -rf .next` + fresh `npm run build`: the route tree confirms the
  restructure exactly (`/[lang]` with `/en`+`/es-AR` statically generated
  via `generateStaticParams`, `/[lang]/*` dynamic for everything else,
  `/api/**` untouched, unprefixed) — an earlier build attempt against a
  stale `.next` typegen cache from before the move surfaced misleading
  "cannot find module" errors for the old paths, resolved by clearing it.
- Locale resolution precedence, all 4 branches, via direct HTTP: bare `/`
  with nothing set → `307` to `/en`; same with `Accept-Language:
  es-AR,es;q=0.9` → `/es-AR`; a `lang=es-AR` cookie correctly overrides an
  `Accept-Language: en-US` header → `/es-AR`.
- Auth-gate + locale interaction, both directions: unauthenticated `/en`
  → `/en/login?next=%2Fen`; authenticated visit to `/en/login` → redirects
  away to `/en`; authenticated `/` → `/en/dashboard`.
- Real authenticated navigation across both locales: `/en/dashboard`,
  `/es-AR/dashboard`, `/en/inventory`, `/en/notifications`, `/en/friends`
  all `200`, via a real session cookie generated with the actual
  `@supabase/ssr` package (same technique step 51 established).
- Rendered HTML inspected directly (not just status codes): every `href`
  on the dashboard and notifications pages for both locales is correctly
  prefixed (`/en/...` / `/es-AR/...`) — including the notifications page's
  dynamically-built href from a real inserted `friend-request`
  notification row, and confirmed **zero** unprefixed hrefs leak through
  on either page.
- Both dictionary files load correctly and structurally match (verified
  directly via Node's native TS stripping, not just TypeScript's
  compile-time check).
- `npm run lint` / `npm run build` clean.

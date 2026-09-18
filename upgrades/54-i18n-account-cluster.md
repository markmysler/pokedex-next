# Step 54: i18n content — Account cluster

**Status: Shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

First content step, needs step 53's routing/dictionary infrastructure to
exist. Independent of 56/57/58 — order among the 4 content steps follows
`design/REDESIGN_TRACKER.md`'s own cluster grouping, not a real dependency
chain; this one's listed first simply because it's the smallest/simplest
surface to prove the pattern out on before the larger clusters.

## What changes

Covers the same "Account cluster" `design/REDESIGN_TRACKER.md` already
defines: **Login, Signup, Dashboard, Profile** — plus the shared `SideNav`/
`WelcomeDialog` strings that render on every page regardless of cluster
(theme/sound/language toggle labels, nav link labels, sign-out button,
starter-selection onboarding copy).

For each screen: replace every literal English string in both the Server
Component (`page.tsx`) and any Client Component it renders with a
dictionary lookup via `getDictionary()`/`next/root-params`, following the
pattern step 53 established. Populate the real `es-AR` translation
alongside each key — not a placeholder, and not neutral Latin American
Spanish (real `vos`/`che` register, per `main.md`'s key decisions).

Specific known text surfaces to check (found during planning, not
exhaustive): `DashboardPage`'s stat-strip labels, card titles, and note
sentences (`app/(app)/dashboard/page.tsx`); `WelcomeDialog.tsx`'s starter-
pick onboarding copy (already flagged once before, in
`archive/v6/45-bot-battle-lootbox-rate-increase.md`, for a stale rate
mention — check it again here for anything still hardcoded in English);
`SideNav.tsx`'s nav labels and the theme/sound/language toggle rows
themselves.

### What does NOT change in this step

- No new routing/dictionary mechanics — that's step 53's job, already done.
- Species names, move names, and other game-content proper nouns stay as-is
  in both locales (not currently in scope to translate "Pikachu" itself,
  only UI chrome and prose) — confirm this assumption holds if anything
  surprising comes up during implementation.

## End state

- [x] Login, Signup, Dashboard, Profile, and the shared `SideNav`/
      `WelcomeDialog` render fully in either locale with no leftover
      hardcoded English string when `es-AR` is selected (and vice versa).
- [x] Toggling the language on any of these screens re-renders correctly
      with no console hydration warnings.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

### Dictionary shape

`lib/i18n/dictionaries/en.ts` dropped step 53's placeholder object for a
real one: `common` picked up `nav` (one key per `SideNav` link, shared
across every page regardless of cluster), `theme`/`sound`/`language` row
labels, and `signOut`/`signingOut` — none of that is Account-cluster
content, but it renders everywhere via the shared shell, so it lives
outside `account` rather than being duplicated per cluster. `account`
picked up `login`/`signup`/`dashboard`/`profile`/`welcome`, one sub-object
per screen. A few entries are functions instead of plain strings
(`dashboard.strongestNote(count, total)`) wherever the English sentence
embeds a value — this lets `es-AR` place the value wherever its own word
order needs it instead of being forced into a fixed placeholder position.
Sentences that mix plain and `<strong>` text (the Welcome dialog's bolded
lead-ins, Signup's confirm-email screen) split into `xBold`/`xRest` or
`xPrefix`/`xSuffix` pairs so the emphasis markup stays in the component,
not baked into translated prose.

One correction made mid-implementation: `en.ts`'s object literal is no
longer `as const`. It was in step 53 (when `es-AR.ts` was a literal copy),
but `as const` infers every string as its own literal type, and since
`getDictionary.ts`'s `Dictionary` type is derived from `typeof en`, that
would force `es-AR.ts` to use the *exact same English text* for every key
to type-check — caught immediately by `npm run build`'s first attempt
(70 `TS2322` errors, one per key). Removing `as const` keeps the shape
(same keys, same function signatures) enforced while letting each
locale's values differ freely.

### `es-AR` register

Real `vos`-form Argentinian Spanish throughout (`¿No tenés cuenta?`,
`Iniciá sesión`, `Compartí este código`), not neutral Latin American
Spanish, per `main.md`'s key decision. Species names, move names, and the
`EN`/`ES` toggle labels themselves stay untranslated, as scoped.

### Server/Client split for Login and Signup

Both were entirely Client Components in step 53 (needed `useRouter`/
`useSearchParams`), and Client Components can't call `next/root-params` or
`getDictionary()`. Rather than prop-drilling the locale down to fetch a
dictionary client-side, each page split in two: `app/[lang]/login/
page.tsx` and `.../signup/page.tsx` are now thin `async` Server Components
that call `getDictionary()` and pass the relevant slice down as a `dict`
prop to a new Client Component (`components/auth/LoginForm.tsx` /
`SignupForm.tsx`, moved out of the page files verbatim otherwise). Same
pattern applied to `ProfilePageClient` (already split from its page) and
`SignOutButton`/`WelcomeDialog` (rendered from the already-Server-Component
`app/[lang]/(app)/layout.tsx`, which now fetches one dictionary and
threads slices to `SideNav` (`dict.common`, which forwards `signOut`/
`signingOut` into `SignOutButton`) and `WelcomeDialog` (`dict.account.
welcome`).

`SideNav.tsx`'s `LINKS` array changed from hardcoded `label` strings to a
`key` into `dict.nav`, typed as `keyof Dictionary["common"]["nav"]` via
`as const satisfies` so a typo in a link's key fails to compile rather than
rendering `undefined`.

### Dashboard

Already a Server Component — no split needed, just `const dict = await
getDictionary()` and swapping every literal string (headings, stat-tile
labels, card titles, note sentences, match-row text) for `dict.account.
dashboard.*`.

### Validation performed (real HTTP against a running `next start` server, local Supabase)

- `rm -rf .next` + fresh `npm run build`, `npm run lint`: both clean.
- Unauthenticated Login/Signup in both locales, direct HTML grep: all
  labels, headings, and switch-language links render in the right
  language, no cross-contamination.
- Two fresh accounts created via `@supabase/ssr`'s real `signUp()` (one
  used to test `?welcome=1` in each locale), a third existing account
  logged in via `signInWithPassword()` for Dashboard/Profile checks — all
  session cookies genuine, generated the same way step 51 established, no
  browser involved.
- Authenticated Dashboard and Profile fetched in both locales with a real
  session cookie: every heading, stat label, card title, and note
  sentence confirmed present in the expected language.
- `WelcomeDialog` fetched via `/dashboard?welcome=1` in both locales for
  two separate fresh signups: heading, all 4 bulleted list items (with
  their bolded lead-in terms), and the dismiss button all correctly
  localized.
- Negative check: grepped the `es-AR` dashboard for English chrome
  strings (`Dashboard`, `Battle stats`, `Log out`, …) and the `en`
  dashboard for Spanish ones (`Inicio`, `Estadísticas`, `Cerrar sesión`,
  …) — zero matches either direction.

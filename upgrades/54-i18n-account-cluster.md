# Step 54: i18n content — Account cluster

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
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

- [ ] Login, Signup, Dashboard, Profile, and the shared `SideNav`/
      `WelcomeDialog` render fully in either locale with no leftover
      hardcoded English string when `es-AR` is selected (and vice versa).
- [ ] Toggling the language on any of these screens re-renders correctly
      with no console hydration warnings.
- [ ] `npm run build` / `npm run lint` clean.

# Step 33: Account cluster — Login, Signup, Dashboard, Profile

**Status: shipped**, 2026-08-19.

## Why here

First page-level step, deliberately the smallest surface area (4 mostly
form-shaped screens, no data-dense grids or battle state) — validates
that the shell (32) and primitives (31) hold up wired into a real page
before tackling the bigger clusters. Depends on 30, 31, 32.

Reference: `design/REDESIGN_TRACKER.md`'s Account cluster artifact.

## What changes

- **`app/login/page.tsx`, `app/signup/page.tsx`**: no structural change
  — still a centered `.auth-page`/`.auth-form` card — just restyled via
  step 30/31's tokens (already mostly automatic through shared classes).
  Verify the "check your email" alt state in signup still reads
  correctly on the new palette.
- **`app/(app)/dashboard/page.tsx`**: the one real layout change in this
  cluster. Add a **stat strip** above the existing card grid — 4 tiles
  (bot wins, bot win rate, online wins, dex-owned %) pulled from the
  same `stats` object already fetched server-side, replacing their
  current burial inside the "Battle Stats"/"Collection Stats" prose
  cards. Those two cards stay (they still hold the remaining stats —
  bot losses, online losses/win rate, lootboxes opened, released count,
  most-used/most-owned) but the 4 headline numbers move up top. "Your
  Team" and "Recent Matches" cards keep their current content, restyled
  with `CardTab` headers. Grid: `.dashboard-grid` becomes 4-across
  ≥720px (the stat strip) / 2×2 below, per §7 — a new `.stat-strip`
  class, doesn't reuse `.dashboard-stats-grid`.
- **`app/(app)/profile/page.tsx` / `components/profile/ProfilePageClient.tsx`**:
  add the avatar circle (a placeholder glyph, e.g. 👤, in a
  `.avatar-lg` circle — no real avatar upload system exists or is being
  added, this is purely decorative per the mockup) above the existing
  form. Friend-code card gets the `.code-plate` treatment (already used
  today via `.friend-code-display` — rename/restyle in place, or keep
  the class name and just restyle it, implementer's call as long as the
  visual matches the mockup).
- **`components/nav/SideNav.tsx`**: no further change here beyond what
  32 already did — this step is the first to render real content inside
  it, so it's also the first opportunity to catch shell bugs (e.g. a
  page whose content is too tall/short and exposes a shell layout issue).

## End state

- [x] Login/Signup match the Account cluster mockup in both themes, both
      breakpoints (desktop card, full-bleed-ish mobile card) — verified
      unchanged, since these needed no code changes: both already read
      the step 30/31 tokens automatically through `.auth-page`/
      `.auth-form`/`.btn-primary`. The "check your email" alt state's
      markup/classes are untouched by this step (not independently
      re-screenshotted — this Supabase project doesn't require email
      confirmation, so it can't be reached live without disabling that
      setting, and there was nothing to change in its code either way).
- [x] Dashboard shows the new 4-tile stat strip above the existing card
      grid (bot wins, bot win rate, online wins, dex-owned %); Battle
      Stats/Collection Stats keep the remaining 3+4 numbers; all four
      cards now use `CardTab` headers. All numbers still come from the
      same `getDashboardStats` call — no new queries.
- [x] Profile shows the avatar + form + code-plate layout from the
      mockup; save flow (`PATCH /api/profile`) exercised live — renamed
      a real test account's display name, confirmed "Saved ✓" and the
      new name reflected in both the profile header and the sidebar
      (via `router.refresh()`, unchanged behavior).
      (Implementation note: nesting the avatar header + form inside one
      `.card` — instead of the form itself being the `.card` as before —
      needed a small unplanned fix: `.auth-form`'s own 360px max-width
      only made sense when it *was* the whole card; nested inside a
      wider, unconstrained card it left an awkward gap. Added
      `.profile-card { max-width: 420px }` on the outer card and a
      compound `.auth-form.profile-form { max-width: none }` override so
      the form fills its now-correctly-capped parent instead of
      double-capping narrower.)
- [x] All four screens verified at desktop (1280px, rail nav) and mobile
      (390px, bottom-tab shell from step 32) widths, both themes, via
      Playwright against the real running app (not static markup) —
      including a fresh disposable signup to reach Dashboard/Profile.
- [x] `npm run build` and `npm run lint` clean; zero console errors across
      the whole flow (login → signup → dashboard → profile → save).

# Step 33: Account cluster — Login, Signup, Dashboard, Profile

**Status: not started**

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

- [ ] Login/Signup match the Account cluster mockup in both themes, both
      breakpoints (desktop card, full-bleed-ish mobile card).
- [ ] Dashboard shows the new 4-tile stat strip above the existing card
      grid; all numbers still come from `getDashboardStats` (no new
      queries — this is a layout change, not a data change).
- [ ] Profile shows the avatar + form + code-plate layout from the
      mockup; save flow (`PATCH /api/profile`) unchanged and still
      works.
- [ ] All four screens verified at desktop (rail nav) and mobile
      (bottom-tab shell from step 32) widths, both themes.
- [ ] `npm run build` clean; no console errors/hydration warnings
      introduced.

# Step 30: Design tokens & global foundations

**Status: shipped**, 2026-08-19.

## Why here

Every later step in this wave depends on the token set existing — a
button, a card, a nav link, all read colors/spacing/radius/type from CSS
custom properties in `app/globals.css`. Doing the palette/type/spacing
swap first, in isolation, means every subsequent step is "apply new
component classes" against a codebase that already looks (in raw color
terms) like the target, rather than fighting the old and new systems at
once.

Source of truth for every value in this step: `design/DESIGN_SYSTEM.md`
§§1–3, and the token block repeated at the top of each artifact in
`design/REDESIGN_TRACKER.md`.

## What changes

**File**: `app/globals.css` only. No component/page files touch in this
step — the goal is that the app keeps working exactly as it does today,
just repainted, because every existing class (`.card`, `.btn-primary`,
`.type-badge`, etc.) already reads from these custom properties.

1. **Replace the token block** (`:root[data-theme="dark"]`,
   `:root[data-theme="light"]`) with the new casing/accent/semantic set
   from `DESIGN_SYSTEM.md` §1. Old → new name mapping (update every
   consumer in this same file as part of this step, not later):
   - `--bg-main` → `--bg`
   - `--bg-card` / `--bg-sidebar` / `--bg-banner` / `--bg-fighter-card` →
     `--surface` / `--surface-2` / `--surface-3` (collapse to the 3-tier
     system; pick per-usage based on visual nesting depth, not a 1:1
     rename — e.g. `--bg-fighter-card` becomes `--surface` since fighter
     cards are top-level panels, not nested-within-a-card panels)
   - `--text-primary` / `--text-secondary` / `--text-muted` → `--ink` /
     `--ink-soft` / `--ink-faint`
   - `--border-color` → `--border` (add the new `--border-strong` for
     input/button borders, doesn't exist today)
   - `--hover-color` → drop; hover states now derive from `--surface-3`
     or a `color-mix()` tint of `--accent`, not a separate token
   - `--input-bg` → `--surface` (inputs sit on `--surface`, bordered with
     `--border-strong`, no separate input-background tier)
   - Add net-new tokens with no old equivalent: `--accent`, `--accent-2`,
     `--accent-ink`, `--good`/`--good-bg`, `--warn`/`--warn-bg`,
     `--bad`/`--bad-bg`, `--info`/`--info-bg`.
   - `#2FA572` (today's hardcoded "active/selected" green, used ~15 times
     throughout the file) — every literal use becomes `var(--accent)`.
     This is a real behavior change: selected/active state moves from
     green to Poké Red across the whole app in one pass. Don't leave any
     old green literal behind.
   - Type colors (`TYPE_COLORS` in `lib/typeData.ts`, consumed via inline
     `style={{background: ...}}` from React, not CSS vars) stay a
     TypeScript object, not a CSS token — but update its 18 hex values to
     `DESIGN_SYSTEM.md` §1's refined set in this step too, since it's the
     same palette decision and trivial to do alongside.
2. **Add the spacing/radius/shadow scale** as new custom properties
   (`--s-1`…`--s-9`, `--r-sm`…`--r-pill`, `--shadow-1`/`--shadow-2`) per
   §3. Don't yet rewrite every hardcoded `padding: 15px` etc. in this
   step (that happens naturally as each later step touches a given
   class) — just make the scale available.
3. **Typography**: add `--font-display` / `--font-body` / `--font-mono`
   per §2. Update `body { font-family: ... }` to `--font-body`. Update
   every `h1`–`h4` rule to `--font-display`, weight 800, tight
   letter-spacing. Update `.battle-log`, `.stat-value`, `#notes-box`
   equivalents, and anywhere numbers currently render in the body font
   (dex numbers, HP/MP text, room codes) to `--font-mono` with
   `font-variant-numeric: tabular-nums`.
4. Keep every existing class name and selector as-is in this step —
   only the values they resolve to change. Renaming/restructuring
   classes (the segmented meter, the bezel-tab header, etc.) is step 31.

## End state

- [x] `app/globals.css`'s token block matches `design/DESIGN_SYSTEM.md`
      §1 exactly, in both `[data-theme]` variants.
      (Implementation note: this app always has `data-theme="dark"|"light"`
      explicitly set — `app/layout.tsx` hardcodes `data-theme="dark"` at
      SSR time and `SideNav.tsx`'s toggle sets it client-side — so there's
      no bare `prefers-color-scheme` fallback layer in the real app,
      unlike the standalone mockup artifacts which needed one to render
      correctly outside the app shell. Spacing/radius/font tokens, being
      theme-independent, live in a new bare `:root {}` block instead.)
- [x] No literal `#2FA572` remains anywhere in `app/globals.css` —
      `grep -c "#2FA572"` returns 0 (two explanatory code comments that
      *mentioned* the old hex as prose were reworded to avoid a false
      positive on this check).
- [x] `lib/typeData.ts`'s `TYPE_COLORS` matches the refined 18-color set.
- [x] `npm run build` and `npm run lint` clean.
- [x] Manual pass via a Playwright screenshot of `/login` (unauthenticated,
      but exercises `.card`/`.auth-form`/inputs/links against the real
      running app) in both dark and light theme (light forced via the
      same `document.documentElement.dataset.theme` mechanism the
      sidebar toggle uses) — new palette renders correctly, no invisible
      text, no missing backgrounds, zero console errors. Authenticated
      pages (Dashboard, Pokédex, etc.) weren't separately screenshotted
      to avoid creating throwaway account data in the shared Supabase
      project, but share the identical token mechanism just confirmed
      working, plus a clean build/lint across every file that references
      these tokens.
      (Implementation note: as documented above, `.btn-primary` and a
      handful of other non-`#2FA572` hardcoded hex values — e.g. the blue
      primary-button/link color, the gold shiny/lootbox color, individual
      status-badge hues — were deliberately left untouched in this step;
      they're explicitly in scope for step 31 and later steps, which is
      why the login screenshot still shows a blue "Log in" button. This
      matches the step plan, not a miss.)

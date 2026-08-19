# Step 30: Design tokens & global foundations

**Status: not started**

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

- [ ] `app/globals.css`'s token block matches `design/DESIGN_SYSTEM.md`
      §1 exactly, in both `prefers-color-scheme` and both
      `[data-theme]` variants.
- [ ] No literal `#2FA572` (or any other hardcoded color this wave
      replaces) remains anywhere in `app/globals.css` — `grep -c
      "#2FA572"` returns 0.
- [ ] `lib/typeData.ts`'s `TYPE_COLORS` matches the refined 18-color set.
- [ ] `npm run build` clean, no unused-token lint issues.
- [ ] Manual pass: load every existing page in both themes (toggle via
      the sidebar switch, unchanged in this step) — layout and
      interaction are pixel-identical to before, only colors/type
      changed. No component should look "broken" (missing background,
      invisible text) — that would mean a token rename was missed.

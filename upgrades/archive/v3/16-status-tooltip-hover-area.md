# Step 16: Status-badge tooltip hover area

## Why here

Independent, small, and purely CSS — no dependency on steps 17 or 18 or
anything else. Done first simply because it's the quickest to clear.

## What changes

### The bug
The Bleeding/Blinded/Poisoned status badges (`StatusBadges` in
`components/battle/FighterCard.tsx`, added in the v2 plan's post-plan
UI-polish pass) already carry a `title` attribute on the whole `<span
className="status-badge ...">` element, covering the emoji *and* the
label text (`🩸 Bleeding (2)`) in the JSX. In practice, hovering only
reliably shows the tooltip over the emoji glyph itself, not the padded
area around the rest of the pill.

`.status-badge` has no explicit `display` set, so it renders as a default
`display: inline` element. Padding on an `inline` element is visually
present but its hover/hit-test box for native tooltips isn't guaranteed
by every rendering engine to include that padding consistently — the
glyph run itself is reliably hoverable, the surrounding box isn't
uniformly.

### The fix
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  ...
}
```
Turning it into an explicit flex box (instead of default `inline`) gives
it a well-defined content box that includes its own padding in the
hover/hit-test region across engines — same fix category as giving a
"pill" a real box instead of relying on inline text-flow, standard for
this exact class of bug. No change to the `title` text itself, the JSX,
or `.status-badges.compact`'s bench-sized variant (inherits the same
fixed `.status-badge` rule).

## End state

- [x] Hovering anywhere on a status pill — including the padding around
      the label, not just the emoji glyph — shows its tooltip, for all
      three effects (Bleeding, Blinded, Poisoned).
- [x] Same holds for the compact bench-member badges, not just the active
      fighter's.
- [x] Verified in both the local Battle page and the Online Battle page
      (both render through the same shared `FighterCard`/`StatusBadges`,
      so one code change covers both — confirm it actually does).
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- No schema change, nothing to push/apply — pure CSS.
- Fetched the actual served (non-minified in dev) stylesheet from a
  running dev server and confirmed `.status-badge` compiles to
  `display: inline-flex; align-items: center; ...` in the real bundle,
  not just in the source file. `.status-badges.compact .status-badge`
  (the bench-sized variant) inherits the same base rule — no separate
  `display` override exists for it, confirmed by reading the cascade, so
  both the active-fighter and bench badges get the fix from one change.
  `FighterCard`/`StatusBadges` is the single shared component both
  `BattleArena.tsx` (local) and `OnlineBattle.tsx` render through — no
  separate implementation to check.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): the actual mouse-hover experience
  — confirming the tooltip visually appears when the pointer is over the
  padded area specifically, not just that the CSS box now includes it.
  `display: inline-flex` reliably including its own padding in the
  hover/hit-test region is standard, well-established CSS behavior, not
  something this fix is inventing — same category of gap flagged in
  every prior step's validation notes.

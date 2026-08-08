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

- [ ] Hovering anywhere on a status pill — including the padding around
      the label, not just the emoji glyph — shows its tooltip, for all
      three effects (Bleeding, Blinded, Poisoned).
- [ ] Same holds for the compact bench-member badges, not just the active
      fighter's.
- [ ] Verified in both the local Battle page and the Online Battle page
      (both render through the same shared `FighterCard`/`StatusBadges`,
      so one code change covers both — confirm it actually does).
- [ ] `npm run build` / `npm run lint` clean.

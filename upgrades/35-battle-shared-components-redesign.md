# Step 35: Battle shared components — FighterCard, MoveButton, AllyTargetPicker, BattleResultDialog

**Status: shipped**, 2026-08-19.

## Why here

`FighterCard`/`MoveButton`/`AllyTargetPicker`/`BattleResultDialog` are
rendered identically by both `BattleArena.tsx` (bot, step 36) and
`OnlineBattle.tsx` (PvP, step 37) — doing this restyle once, before
either page-wiring step, means 36 and 37 are both pure "already-restyled
components, just confirm they read correctly on each page's layout"
rather than duplicating the same component work twice. Depends on 30, 31.

Reference: `design/REDESIGN_TRACKER.md`'s Battle cluster artifact
("Battle Arena" stage — it's explicitly labeled `/battle · /online` since
one mockup covers both consumers).

## What changes

- **`components/battle/FighterCard.tsx`**: HP and MP rows become
  `SegmentedMeter` (step 31) — HP's lit-segment color still shifts
  green→amber→red by percentage (`hpPct > 0.5` etc., logic unchanged,
  just feeds `SegmentedMeter`'s `color` prop instead of an inline
  `style`). `StatusBadges`' per-status colors move onto the semantic
  tokens per `DESIGN_SYSTEM.md` §6 (bleed/poison/burn/freeze/blind keep
  distinct hues; buff/debuff/shield/redirect map to
  good/bad/info/warn) — this is a value change in the existing
  `STATUS_TOOLTIPS`-adjacent color constants, not a new prop. Bench-member
  buttons restyle per mockup (sprite + name + HP row, compact status
  badges) — no prop/behavior change, `onSwitchTo`/fainted-disabled logic
  untouched. `movesCaption` and the `<h3>` title get `CardTab`-adjacent
  styling (a plain restyle is fine here — `CardTab`'s literal component
  may not fit inside a fighter card's own layout; match the mockup
  visually, component reuse is a nice-to-have not a requirement in this
  one spot).
- **`components/battle/MoveButton.tsx`**: `KIND_COLOR` map (already
  touched once in step 31 for the base palette) gets a final check
  against the mockup's move-button treatment — damage moves keep
  `TYPE_COLORS[move.type]`, buff/debuff/drain/redirect use
  `var(--good)`/`var(--bad)`/`var(--info)`/`var(--warn)` — plus the
  `.movebtn`-style layout (name in display font, meta line in mono,
  subtle top-highlight gradient) from the mockup.
- **`components/battle/AllyTargetPicker.tsx`**: restyle only (reuses
  `.bench-row`/`.bench-member`, whatever FighterCard's bench treatment
  ends up being) — no logic change.
- **`components/battle/BattleResultDialog.tsx`**: restyle onto the new
  `Modal`/button tokens — victory/defeat icon + copy unchanged, lootbox
  callout (`.battle-result-lootbox`) recolored to `--accent-2` (gold)
  instead of the old hardcoded gold hex.

## End state

- [x] `FighterCard` renders `SegmentedMeter` for HP and MP, both in the
      active-fighter size and the compact bench size. Bench only shows
      HP, not MP — `TeamMemberDisplay` never carried mp/maxMp for bench
      members (pre-existing data shape, not something this step added),
      so there's no MP value to render there; the active card still
      shows both.
- [x] Every status badge (bleed/blind/poison/burn/freeze/buff/debuff/
      shield/redirect) matches `DESIGN_SYSTEM.md` §6's color mapping —
      spot-checked via a temporary `FighterCard` mount on `/login` with
      every status hardcoded (bleedTurns/blindTurns/poisonTurns/
      burnTurns/freezeTurns all set, plus atkMod/defMod both directions,
      shieldPoints, redirectTurns, and a poisoned bench member), screenshotted
      in both themes, then fully reverted (`git checkout` — verified empty
      diff). buff/debuff/shield/redirect were already on good/bad/info/warn
      tokens from step 31; bleed/blind/poison/burn/freeze keep their
      existing distinct hex hues per §6 ("keep distinct saturated hues") —
      confirmed these read correctly with white text in both themes, no
      value changes needed.
- [x] `MoveButton` colors damage moves by type, support-kind moves by
      semantic color (also spot-checked in the same throwaway mount, one
      move of each kind: damage/buff/debuff/drain/redirect); tooltip/
      disabled/insufficient-mana logic untouched — only the label
      changed from one string to two (`move-btn-name`/`move-btn-meta`
      spans), same computed text content as before.
- [x] `AllyTargetPicker` and `BattleResultDialog` visually match the
      mockup; no prop/behavior regressions — `AllyTargetPicker`'s bench
      buttons now show the same compact `SegmentedMeter` HP treatment as
      `FighterCard`'s bench, replacing the old plain HP text.
- [x] Verified live against the real `/battle` page (already wired to
      these four components before this redesign wave started — steps
      36/37 are about restyling the *page* layout around them, not first
      wiring them in), via Playwright with a fresh disposable signup
      (new accounts start with 3 starters, enough for a 3v3 team):
      picked a team, played ~14 rounds of real bot battle, screenshotted
      the arena in both themes and at mobile width, and cropped the
      active fighter card and move-button grid for a close look. Zero
      console errors.
- [x] `npm run build` and `npm run lint` clean.

### Implementation notes

- **`SegmentedMeter` had to switch from `<div>` to `<span>` at its root**,
  found while wiring the bench-member meters — `FighterCard.tsx`'s bench
  buttons are `<button>` elements (a `<div>` isn't valid phrasing content
  inside one, same reason `StatusBadges` was already a `<span>`), and this
  step is the first to nest `SegmentedMeter` inside one. Since `.meter`'s
  layout comes entirely from CSS `display: grid` (and `.segbar`'s from
  `display: flex`), the tag swap has no visual effect anywhere else — its
  three existing consumers (Pokédex/Inventory detail, LootboxRevealDialog)
  aren't inside buttons and render identically.
- **`hpColor()` extracted as a small helper**, duplicated (not imported)
  into `AllyTargetPicker.tsx` — same call as `StatusBadges` already made
  before this step (that component reuses `.bench-row`/`.bench-member`'s
  visual language by copying it, not by importing `FighterCard`), so this
  keeps the existing pattern rather than introducing a new shared-utility
  file for one three-line function.
- **Bench meters intentionally show only HP, not MP** — `TeamMemberDisplay`
  (the bench data shape) never carried `mp`/`maxMp` in the first place, so
  "SegmentedMeter for HP and MP... in the compact bench size" reads as
  "whichever of HP/MP the bench already had data for," not a mandate to
  invent bench MP tracking. Worth flagging for step 36/37: if a future
  design wants bench MP visible, that's a data-shape change to
  `TeamMemberDisplay`/wherever it's built, not just a component restyle.
- **`.fighter-name-tab` and the `.moves-caption` pill hand-style the
  bezel-tab language instead of using the literal `CardTab` component**,
  exactly as the plan pre-authorized — `CardTab` expects a fixed icon
  prop and `fighter-card`'s centered column layout doesn't have a natural
  icon slot for a dynamic "You: Bulbasaur" title. Both reuse the same
  dark-pill-on-light/light-pill-on-dark visual recipe as `CardTab` itself
  (`background: var(--ink); color: var(--bg)` for the name tag, a lighter
  `--surface-2` pill for the caption) so they still read as the same
  design language up close.
- **Move buttons split from one packed string into two spans**
  (`.move-btn-name` display-font, `.move-btn-meta` mono) rather than
  changing what information is shown — `insufficientMana`'s "drop the
  effect text, keep the MP cost" behavior is preserved exactly, just
  spread across two lines instead of parenthesized inline.
- **Spot-check used a throwaway mount on `/login`, same precedent as step
  31** (temporary demo code added to a real page, screenshotted in both
  themes, then `git checkout`'d back to a verified-clean diff) — this was
  the only way to see every status badge and move kind at once, since a
  real bot battle's RNG doesn't reliably land bleed/poison/burn/freeze/
  buff/debuff/shield/redirect (or non-damage moves at all, for these
  starter movesets) inside a reasonably-sized test run.

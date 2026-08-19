# Step 35: Battle shared components — FighterCard, MoveButton, AllyTargetPicker, BattleResultDialog

**Status: not started**

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

- [ ] `FighterCard` renders `SegmentedMeter` for HP and MP, both in the
      active-fighter size and the compact bench size.
- [ ] Every status badge (bleed/blind/poison/burn/freeze/buff/debuff/
      shield/redirect) matches `DESIGN_SYSTEM.md` §6's color mapping —
      spot-check by forcing each status in a local test battle (or a
      temporary hardcoded prop pass) since not all statuses are easy to
      trigger on demand.
- [ ] `MoveButton` colors damage moves by type, support-kind moves by
      semantic color, tooltip/disabled/insufficient-mana behavior
      unchanged.
- [ ] `AllyTargetPicker` and `BattleResultDialog` visually match the
      mockup; no prop/behavior regressions.
- [ ] Since neither `BattleArena.tsx` nor `OnlineBattle.tsx` is wired to
      the new nav shell's content area yet in a *verified* way until
      steps 36/37, do a throwaway manual render (e.g. temporarily mount
      one `FighterCard` with sample props on any existing page) to
      confirm visually before moving on — don't wait until 36 to
      discover a bug here.
- [ ] `npm run build` clean.

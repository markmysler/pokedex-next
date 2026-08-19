# Step 36: Battle Arena page + Team Picker — bot battle wiring

**Status: not started**

## Why here

Wires the shared components from 35 into the actual `/battle` page and
its `TeamPicker`. Bot battle before online (37) because it has no
realtime/room-state complexity to debug alongside the visual change —
if something looks wrong here, it's the styling, not a sync bug.
Depends on 32 (shell), 35 (shared battle components).

Reference: `design/REDESIGN_TRACKER.md`'s Battle cluster artifact
("Team Picker" and "Battle Arena" stages).

## What changes

- **`components/online/TeamPicker.tsx`** (shared with Online, but this
  is the first page to exercise it): restyle the pick grid
  (`PokemonInstanceCard` grid variant, already restyled in step 34 —
  confirm the `pickOrder` badge still reads correctly against the new
  card style), `PokemonFilterBar` (already restyled in step 31), and the
  lock-in bar per the mockup.
- **`components/battle/BattleArena.tsx`**: 
  - VS header (`.select-bar`) restyles to the mockup's `.vsbar` treatment
    (VS badge, status text, Change Team button).
  - `.arena-frame` — **responsive change**: two `FighterCard`s
    side-by-side ≥720px (unchanged from today's `grid-template-columns:
    1fr 1fr`), stacked vertically (you on top, opponent below) <720px
    instead of squeezing to illegible 50%-width cards. This is a new
    breakpoint rule, not present in the current CSS.
  - Battle log + action row (`.log-container`, `.action-row`) restyle
    per step 31's `.battle-log` fix — verify the theme-correct
    dark/light behavior actually renders right here (this is the first
    page where the log is live, not a mockup).
  - `LootboxRevealDialog`/`BattleResultDialog` usage here is unchanged
    (already restyled in 34/35) — just confirm they render correctly
    inside this page's flow (post-battle win with a lootbox grant).
- **`app/(app)/battle/page.tsx`**: no change expected beyond whatever
  the shell (32) already handles — this file just renders
  `<BattleArena>` inside `.page`.

## End state

- [ ] Team Picker renders correctly wired into `/battle`, including the
      filter bar, pick-order badges, and lock-in button state
      (disabled until exactly 3 picked).
- [ ] Battle Arena's two fighter cards sit side-by-side ≥720px and stack
      (you first) <720px — verified by actually playing a bot battle at
      both widths, not just resizing a static screenshot.
- [ ] Battle log is legible in both themes (dark screen/light text in
      dark mode, flipped in light mode) — the fix from step 31 confirmed
      live, not just in the design artifact.
- [ ] A full bot battle (pick team → fight to a win and a loss → see
      `BattleResultDialog` → optionally open a granted lootbox via
      `LootboxRevealDialog`) plays correctly end-to-end with no console
      errors, in both themes, at both the desktop and stacked-mobile
      arena layout.
- [ ] Auto-battle, reset, and change-team actions all still work.
- [ ] `npm run build` clean.

# Step 36: Battle Arena page + Team Picker — bot battle wiring

**Status: shipped**, 2026-08-19.

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

- [x] Team Picker renders correctly wired into `/battle`: `CardTab`
      header showing live pick count, filter bar, pick-order badges
      (`#1`/`#2`/`#3`) reading correctly against step 34's card restyle,
      and the new sticky `.team-lockbar` (selected count + Lock In
      button, disabled until exactly 3 picked) — verified live picking
      all 3 starters.
- [x] Battle Arena's two fighter cards sit side-by-side ≥720px and stack
      (you first) <720px — verified by actually playing at 760px
      (side-by-side) and 700px (stacked, including submitting a real
      move at that width and watching HP/log update), not just resizing
      a static screenshot.
- [x] Battle log is legible in both themes (dark screen/light text in
      dark mode, flipped in light mode) — confirmed live in both themes;
      no code change was needed here, step 31's fix already applies via
      the shared `.battle-log` class, this just confirms it renders
      correctly on a live, scrolling, real log rather than the mockup.
- [x] A full bot battle (pick team → auto-battle to a win →
      `BattleResultDialog` → Continue → Reset Battle → Change Team back
      to the picker) played correctly end-to-end with zero console
      errors, in both themes. This particular run's 25% lootbox roll
      didn't land, so `LootboxRevealDialog`'s in-battle "Open it now"
      path wasn't re-exercised here — it was already fully validated
      (staggered reveal, shiny treatment, both themes) in steps 34/35,
      and its wiring inside `BattleArena.tsx` (`openLootboxNow`) is
      unchanged by this step.
- [x] Auto-battle, reset, and change-team actions all still work —
      exercised in the same live run above.
- [x] `npm run build` and `npm run lint` clean.

### Implementation notes

- **`BattleArena.tsx` itself needed no JSX changes** — `.select-bar`/
  `.vs-badge`/`.vs-text`/`.fighter-select` already existed and already
  played exactly the "VS badge / status text / Change Team button" roles
  the plan described; this step's `.vsbar` treatment was a CSS-only
  restyle of that existing structure (`.vs-text` became a solid accent
  pill instead of plain gold text). Same for the battle log and
  `LootboxRevealDialog`/`BattleResultDialog` usage — both already correct
  from steps 31/34/35, this step only had to verify them live.
- **`.select-bar` is shared with `OnlineBattle.tsx`** (step 37) — the one
  change made to it here (`flex-wrap: wrap`) is purely additive/safe at
  normal widths, so step 37 inherits it for free without needing its own
  pass. `.vs-badge`/`.vs-text`'s restyle only affects Battle Arena, since
  `OnlineBattle.tsx` doesn't render those two classes at all (confirmed
  via grep before making the change).
- **`.team-lockbar` mirrors Inventory's `.tradeup-bar` sticky-footer
  convention** (from step 34) rather than inventing a new pattern — same
  sticky-bottom-of-card shape, count text + primary action button. Since
  `TeamPicker.tsx` is shared with Online (step 37), that page's team
  picker gets this restyle for free too.
- **`.arena-frame`'s 720px stacking breakpoint is new** — nothing in the
  CSS before this step gave the arena any responsive behavior at all, so
  this was an addition, not a modification of existing rules. Verified
  the exact transition point by testing both 700px (stacked) and 760px
  (side-by-side) explicitly, not just eyeballing one narrow width.

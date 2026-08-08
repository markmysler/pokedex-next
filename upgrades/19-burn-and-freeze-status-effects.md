# Step 19: Burn and Freeze status effects

## Why here

Fourth wave, single new request added 2026-08-08 after steps 16-18 shipped.
Independent of all of them — extends the status-effect layer
`lib/battleEngine.ts` already has (bleed/blind/poison, from the v2 plan's
step 10) with two more kinds, gated by move type the same way poison
already is.

## What changes

### The gap

Today's status effects are inflicted by move **category** (bleed on
physical hits, blind on special hits) or by move **type** (poison, only
from `Poison`-type moves). There's no effect at all tied to `Fire` or
`Ice`-type moves — every other type's moves only ever deal damage.

### Design

Two new kinds, added to `StatusKind` alongside `bleed` | `blind` |
`poison`, both rolled the same way poison already is (independently of
category, gated by `move.type`, same `rollInflictChance()`,
`STATUS_INFLICT_CAP`, and 3-turn `STATUS_DURATION`):

- **Burn** (`Fire`-type moves) — a damage-over-time tick, mechanically
  identical to bleed/poison (5% of max HP per turn). Two type-specific
  twists per the request:
  - **Cannot be inflicted on a `Water`-type target** (checked before the
    inflict roll, same as an immunity — a `Water`-type Pokemon never
    catches fire). This mirrors `Water` being right-fully immune, without
    touching the actual damage-multiplier table in `lib/typeData.ts` —
    that table is about the *hit*, this is about the *status the hit can
    leave behind*, a separate concern.
  - **Extra effect against a `Grass`-type target**: the tick damage
    doubles (10% of max HP instead of 5%) — same "extra effect" framing
    as a super-effective hit, just applied to the status's own damage
    rather than the move's.
- **Freeze** (`Ice`-type moves) — not a damage tick. Instead, while
  `freezeTurns > 0`, *that fighter's own* Attack, Special Attack, Defense,
  Special Defense, and Speed are all reduced by a flat 30% — a frozen
  Pokemon hits softer, folds easier, and acts later, for as long as it's
  frozen. Applies symmetrically regardless of which side is attacking
  that turn (a frozen Pokemon is weaker whether it's currently attacking
  or being attacked), and to the speed roll that decides turn order.
  - **No effect against a `Fire`-type target** (checked before the
    inflict roll, same immunity shape as burn/Water above — a `Fire`-type
    Pokemon doesn't freeze).
- Both decay by one turn at the same point in the turn cycle
  `applyStatusTick()` already handles bleed/poison at (start of the
  *active* member's turn, frozen/paused while benched) — freeze logs
  "is still frozen" / "thawed out" there even though it deals no direct
  damage, so a player can see the counter without opening a tooltip.
- `StatusBadges` (`components/battle/FighterCard.tsx`) gains two more
  badges (🔥 Burning, ❄️ Frozen) with the same `title`-tooltip pattern
  step 16 just fixed the hover area for, and two more `.status-badge`
  color rules in `globals.css`.
- No new API surface, no schema change — this is entirely inside the
  pure `lib/battleEngine.ts` module plus its two callers (`BattleArena`,
  `OnlineBattle`, both local — online rounds resolve server-side via the
  same module already, nothing route-specific to change).

## End state

- [x] A `Fire`-type move can inflict Burn on a non-`Water` target;
      verified via a scripted battle (deterministic RNG stub or enough
      trials), not just reading the code.
- [x] Burn never lands on a `Water`-type target, in any number of trials.
- [x] Burn's tick damage is measurably double on a `Grass`-type target
      vs a same-HP non-`Grass` target.
- [x] An `Ice`-type move can inflict Freeze on a non-`Fire` target.
- [x] Freeze never lands on a `Fire`-type target, in any number of trials.
- [x] While frozen, the affected fighter's effective atk/def/spd are
      measurably reduced (weaker hits dealt, more damage taken, moves
      later in turn order) compared to an identical unfrozen fighter.
- [x] Both new statuses show a badge with a working hover tooltip on both
      the active fighter card and the 3v3 bench row, matching the
      existing bleed/blind/poison badges' look and behavior.
- [x] Existing bleed/blind/poison behavior is unchanged (regression
      check, not just "still compiles").
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean. No schema change, nothing
  to push/apply — this step is entirely inside `lib/battleEngine.ts` and
  its existing callers.
- No dedicated test runner exists in this repo (all prior validation in
  this plan has been live HTTP checks against a running dev server, not
  unit tests). Since `lib/battleEngine.ts` has no HTTP surface of its own
  (it's pure logic, called directly from client components and re-used
  server-side by the room-move route), validation added a **temporary**
  `GET /api/dev-validate-19` Route Handler that called the actual exported
  `executeMove`/`resolveRound`/`buildFighterState` functions with
  controlled matchups and returned the results as JSON — hit through the
  real running dev server (behind the same auth proxy as everything else,
  using a disposable Supabase test account's session cookie), then
  **deleted before committing** (never part of the shipped app). All
  checks below are from that run's actual output, not from reasoning about
  the code:
  - **Burn inflict + Water immunity**: 300 trials each. 105/300 (~35%,
    consistent with the existing `STATUS_INFLICT_CAP` of 0.3) inflicted on
    a non-Water target; 0/300 on a Water-type target.
  - **Freeze inflict + Fire immunity**: 300 trials each. 95/300 inflicted
    on a non-Fire target; 0/300 on a Fire-type target.
  - **Burn's Grass bonus**: two identical-maxHp fighters (1000 HP), one
    Grass-typed, both pre-afflicted with `burnTurns = 3`, one
    `resolveRound()` call (ticks both once): Grass fighter lost 251 HP,
    non-Grass lost 126 — a ~1.99x ratio, matching the intended exact 2x
    (the small gap is the round's own minimal move damage, deliberately
    not eliminated from the measurement).
  - **Freeze's stat debuff**: 500 trials, averaged (the 0.85-1.15 damage
    roll needs averaging to see a 30% effect clearly). A frozen attacker
    dealt 19.99 avg vs 27.84 avg unfrozen (ratio 0.718, vs the intended
    exact 0.7). A frozen defender took 39.26 avg vs 27.91 avg for an
    identical unfrozen defender (inverse ratio 0.711). Both consistent
    with the intended flat 30% reduction plus RNG noise.
  - **Freeze's speed debuff**: 100 trials, two fighters with identical
    base Speed, one frozen. The frozen one acted second in all 100/100
    rounds (a 30% Speed cut vastly exceeds the ±2 per-round speed roll
    noise at this stat range, so this is expected to be exactly 100/100,
    not just "usually").
  - **Regression (bleed/blind/poison unaffected)**: 200 trials of a
    physical Poison-type move (which can independently trigger both bleed
    from its category and poison from its type) — 62/200 bleed, 77/200
    poison, both in the expected range for a ~30%-capped independent roll.
    Confirms the two new type-gated rolls (burn/freeze) added alongside
    poison's didn't disturb the pre-existing ones.
  - **Bug found and fixed during this validation, not by review**: the
    first version of these checks used Grass-type defenders for the
    "can burn/freeze land on a non-immune target" trials and got 0/300 for
    *both* — looked like burn/freeze couldn't be inflicted at all. Root
    cause was in the test, not `battleEngine.ts`: a full-power Fire move
    against a Grass-type defender is super-effective (2x) and one-shot the
    250-HP test defender every time, and the inflict-roll block is gated
    behind `if (defenderState.hp > 0)` — same gate bleed/blind/poison
    already share, working exactly as intended (you can't be left
    burning/frozen by the hit that just knocked you out). Fixed by
    switching those two trials to Normal-type defenders (neutral against
    both Fire and Ice) and dropping the move's power to 1, so the hit
    itself deals single-digit damage and the defender survives to
    actually receive the status.
- **Not independently verified** (same recurring gap as every prior
  step's validation notes — no browser automation tool in this
  environment): the actual in-browser look of the 🔥/❄️ badges and their
  hover tooltips during a real, unscripted battle, since inflicting burn/
  freeze depends on the battle RNG and playing a live battle requires
  browser interaction this environment can't drive. What *was* verified
  directly: the compiled CSS served by the dev server includes the new
  `.status-badge.burn` / `.status-badge.freeze` rules (fetched the actual
  built CSS chunk and grepped it, same method used in step 16), and the
  underlying data (`burnTurns`/`freezeTurns` reaching the badge component
  correctly) via the `executeMove`/`resolveRound` checks above, which
  operate on the exact same `FighterState` shape the UI renders from.

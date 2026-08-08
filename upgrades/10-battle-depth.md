# Step 10: Battle depth — dodge, bleed, blind, and dual-role stats

## Why here

Independent of steps 6-9, but ordered before step 11 (sound effects)
deliberately: this step restructures the battle engine's round-result data
from "just log strings" into structured per-action events (hit/miss,
status inflicted, status ticked, fainted). Step 11 needs exactly that
structured data to trigger the right sound at the right moment without
parsing log text — building it here first means step 11 only has to
*consume* events, not also invent the event model.

## Where this starts from
Today's 6 stats already have *some* differentiated roles: `atk`/`spatk`
drive damage for physical/special moves respectively, `def`/`spdef`
resist them the same way, `spd` decides turn order, `hp` is the health
pool. What's missing is anything beyond flat damage math — no misses, no
damage-over-time, no way for a fight to swing on anything but raw stat
totals and luck-of-the-roll. This step adds a status-effect layer *on top
of* the existing damage formula (which doesn't change) and gives
`def`/`spdef`/`spd` a second job each, so every stat matters in more than
one way.

## What changes

### New mechanics (defaults to tune once built, same framing as step 3's
shiny threshold — these formulas are a reasonable starting point, not a
spec to hit exactly)

- **Dodge**: defender-side, driven by the speed gap. Before applying
  damage, roll `dodgeChance = clamp((defenderSpd - attackerSpd) /
  (attackerSpd + defenderSpd + 100), 0, 0.35)`. On a dodge: 0 damage, no
  status applied, log `"{defender} dodged the attack!"`. Caps at 35% so a
  huge speed mismatch can't make a Pokémon unhittable.
- **Bleed** (physical moves only): attacker-side chance to inflict,
  driven by the same atk/def comparison already used for damage —
  `bleedChance = clamp((atkStat - defStat) / (atkStat + defStat), 0,
  0.3)`. On inflict: defender bleeds for 3 turns (refreshes to 3 if
  already bleeding, doesn't stack multiple instances). While active, at
  the start of that Pokémon's turn (only while it's the *active* member —
  a benched bleeding Pokémon keeps its remaining turn count but doesn't
  take tick damage until swapped back in), it takes `round(maxHp * 0.05)`
  bleed damage and the counter decrements.
- **Blind** (special moves only): same shape as bleed but spatk/spdef-
  driven and self-inflicting-on-the-target's-own-future-accuracy instead
  of damage-over-time: `blindChance = clamp((spatkStat - spdefStat) /
  (spatkStat + spdefStat), 0, 0.3)`. While blinded (3 turns, same
  refresh-not-stack rule), that Pokémon's own attacks get an *additional*
  25% miss chance on top of normal dodge math, representing them
  flailing — decrements once per attack attempt, whether it hit or
  missed.
- **Stat dual roles**, the actual point of this step:
  - `spd`: turn order (existing) **+** dodge chance (new).
  - `atk`/`spatk`: damage (existing) **+** bleed/blind inflict chance
    (new, physical/special respectively).
  - `def`/`spdef`: damage reduction (existing) **+** bleed/blind *resist*
    (new — since bleed/blind chance is computed from the atk-vs-def gap,
    a high defensive stat already lowers the opposing chance; no separate
    formula needed, this falls out of the shared comparison).
  - `hp`: health pool (existing, unchanged) **+** indirectly determines
    bleed's flat tick damage via `maxHp`.

### Engine changes (`lib/battleEngine.ts`)
- `FighterState` (`types/pokemon.ts`) gains `bleedTurns: number` and
  `blindTurns: number` (both default `0` in `buildFighterState`) — pure
  per-battle state, never persisted, resets every battle exactly like
  `hp`/`mp` already do.
- `executeMove()`'s return type changes from `string[]` to a structured
  result (e.g. `{ log: string[]; hit: boolean; dealt: number }`) so
  callers know whether the attack actually landed, not just what got
  logged — needed for step 11's sound hooks, not just this step.
- `resolveRound()`/`resolveTeamRound()` both gain: a dodge roll before
  calling `executeMove()`; bleed/blind inflict rolls after a successful
  hit; a bleed-tick step applied to whichever side's *active* member has
  `bleedTurns > 0` at the point their turn comes up; blind-miss rolled
  into the attacker's own hit chance when `blindTurns > 0`. Both 1v1 (bot)
  and 3v3 (bot + online) share this — no special-casing per mode, same
  reasoning as every other shared-engine step in this plan.
- `TeamRoundResult`/`RoundResult` gain a structured `events` array (per
  action: `{ slot, moveType, hit, dealt, statusInflicted, fainted }`) —
  this is the data step 11 consumes for sound triggers, and incidentally
  makes the existing log strings easier to keep in sync with what actually
  happened.

### UI changes
- `FighterCard.tsx`: small status indicators next to the HP/MP bars for
  the active Pokémon (and, since status persists on the bench, a compact
  indicator on bench members too) — e.g. `🩸 Bleeding (2)`, `🌀 Blinded
  (1)`. New scoped CSS, no library.
- Battle log lines for: a dodge, a bleed tick, a status being inflicted,
  a status expiring — so the log stays a complete, readable account of the
  round the way it already is today.

## End state

- [ ] A dodge can occur and is logged/visible; capped so it's never
      guaranteed or impossible regardless of the speed gap.
- [ ] Bleed can be inflicted by a physical hit, ticks damage at the start
      of the bled Pokémon's turns while active, persists (uneaten by
      ticks) while benched, and expires after its duration.
- [ ] Blind can be inflicted by a special hit, adds a real miss chance to
      the blinded Pokémon's own attacks, and expires after its duration.
- [ ] Existing damage/type-effectiveness math is unchanged for a
      non-dodged, non-blinded hit — this is an additive layer, not a
      rebalance of the base formula.
- [ ] Run a simulation (mirroring step 1's approach) across many bot
      battles confirming: battles still terminate in a bounded number of
      rounds, dodge/bleed/blind rates roughly match the target formulas,
      and no combination of statuses produces a stalemate.
- [ ] Bot and online 3v3 battles both exhibit identical status-effect
      behavior — same shared engine, no mode-specific logic.
- [ ] `npm run build` / `npm run lint` clean.

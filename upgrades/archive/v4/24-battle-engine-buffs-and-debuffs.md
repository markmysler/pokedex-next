# Step 24: Battle engine — buff & debuff execution

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

Closes most of step 23's "known interim gap" — newly-rolled instances'
buff/debuff support moves are now fully executable in a real battle.
Drain and redirect moves (the other 2 support kinds) still throw until
steps 25/26 land.

## Why here

The first of three independent engine-execution steps (24, 25, 26) that
teach `lib/battleEngine.ts` to actually run the new move kinds instead of
just having types for them. Buffs/debuffs first since they're the
foundation the UI (step 28) and validation (step 29) most directly build
on, and because getting the `atkMod`/`defMod`/`shieldPoints` mechanics
right here informs how steps 25/26 read those same fields.

## What changes

### `executeMove()`'s current shape

`executeMove(attackerState, defenderState, move, opts)` today assumes
`move` is always a `DamageMove` — it reads `move.category`/`move.power`
unconditionally. With step 21's discriminated union in place, this
function needs to branch on `move.kind` first. Damage moves keep running
through the exact same code path as today (byte-for-byte unchanged
formula); buff/debuff moves are new branches that don't roll damage at
all.

### Buff execution (`move.kind === "buff"`)

Always targets a single `FighterState` — the caster (self) by default,
or (in 3v3 team battles only, wired up in step 28) an explicitly-chosen
living ally. This step's own scope is the *execution* given a resolved
target; step 28 is what lets a player choose an ally instead of self.

- `statUp`: sets `target.atkMod`/`target.atkModTurns` (or `defMod`/
  `defModTurns`) to the move's `multiplier`/`turns` — **overwrites**, not
  stacks, refreshing back to full duration on re-cast (same "refreshed,
  not stacked" precedent bleed/poison/etc. already established) — so
  re-buffing before a buff expires just extends it at the same magnitude,
  it doesn't compound into a bigger multiplier.
- `heal`: `target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * percentOfMaxHp / 100))`
  — instant, no turn counter.
- `restoreMana`: `target.mp = Math.min(target.maxMp, target.mp + amount)`
  — instant.
- `shield`: `target.shieldPoints += amount` — additive (a second shield
  cast while one is already up stacks the pool, unlike statUp's
  refresh-not-stack — shields have no duration to conflict over, so
  stacking the flat pool is the natural behavior, not a special case to
  guard against).
- `cleanse`: `target.bleedTurns = target.blindTurns = target.poisonTurns
  = target.burnTurns = target.freezeTurns = 0`.

### Debuff execution (`move.kind === "debuff"`)

Always targets the opponent's active member — same implicit targeting
damage moves already use, no picker needed (mirrors main.md's key
decision).

- `statDown`: same mechanism as `statUp`, just typically a `multiplier <
  1` (the field doesn't care which direction — `atkMod`/`defMod` are one
  shared signed system per main.md's key decision).
- `drainMana`: `target.mp = Math.max(0, target.mp - amount)`.
- `removeShield`: `target.shieldPoints = 0`.
- `inflictStatus`: sets the named status's turn field directly to
  `STATUS_DURATION` (bleed/blind/poison/burn/freeze's existing shared
  constant) — guaranteed, no roll, distinct from the existing chance-based
  infliction on damage moves, which is untouched.

### Reading `atkMod`/`defMod` in the damage formula

The existing `freezeAdjusted()` helper (added in step 19) already
multiplies a stat by a per-fighter factor when reading it inside
`executeMove()`. Generalize this same call site to also fold in
`atkMod`/`defMod`:

```ts
const atkStat = Math.max(10, freezeAdjusted(isSpecial ? attacker.spatk : attacker.atk, attackerState) * attackerState.atkMod);
const defStat = Math.max(10, freezeAdjusted(isSpecial ? defender.spdef : defender.def, defenderState) * defenderState.defMod);
```

(Or fold both into one combined helper — exact factoring left to
implementation, the important part is that freeze's existing multiplier
and the new buff/debuff multiplier compose multiplicatively, not one
overriding the other, so a frozen *and* debuffed fighter is doubly
weakened, not just whichever effect was applied most recently.)

### Shield-aware damage application

The current unconditional `defenderState.hp = Math.max(0, defenderState.hp - dmg);` becomes shield-aware for every kind of incoming damage (regular damage moves and drain moves alike, so this is shared plumbing step 25 also depends on):

```ts
function applyDamage(state: FighterState, dmg: number): number {
  const absorbedByShield = Math.min(state.shieldPoints, dmg);
  state.shieldPoints -= absorbedByShield;
  const remaining = dmg - absorbedByShield;
  state.hp = Math.max(0, state.hp - remaining);
  return absorbedByShield; // for the log line
}
```

Log output should say so when a shield absorbs some/all of a hit (e.g.
"🛡️ Shield absorbed 18 damage!" alongside or instead of the normal "Dealt
X damage" line, depending on how much got through).

### Tick/decay

`atkModTurns`/`defModTurns` decay the same way `bleedTurns` etc. already
do — extend the existing per-turn tick function (`applyStatusTick()` in
1v1, its 3v3 equivalent) to also decrement these two fields (and log
"Attack buff wore off" / "Defense debuff wore off" etc. when a counter
hits 0), same "only ticks while active, frozen while benched" rule the
existing five statuses already follow. `shieldPoints` and `redirectTurns`
(step 26) do **not** decay here — shield has no duration (self-limits by
depletion) and redirect's own decay is step 26's concern.

### Mana cost, targeting a non-damage-dealing move

Buff/debuff moves still spend `mana_cost` exactly like damage moves do
(the existing `attackerState.mp -= cost` line at the top of
`executeMove()` doesn't care what kind of move follows it) — no change
needed there.

## End state

- [x] A `statUp`/`statDown` buff/debuff move measurably changes the
      damage dealt/taken by the affected fighter afterward, decaying back
      to normal after its turn count expires — same verification style
      used for step 19's freeze (many trials, averaged, compared against
      an unaffected control). (Swords Dance: 300-trial avg damage 16.3 →
      24.2 after self-casting it, ~1.5x as designed. Harden's `defModTurns`
      confirmed to decay 2→1→0 and `defMod` reset to 1 after 2 status
      ticks via `resolveRound()`.)
- [x] Re-casting a stat buff before it expires refreshes its duration
      without stacking its magnitude (verified: casting `statUp 1.3x` for
      3 turns twice in a row never produces `1.69x`). (Cast Swords Dance
      [1.5x/3t] twice in a row: `atkMod` stayed 1.5, `atkModTurns` reset to
      3, never compounded to 2.25.)
- [x] `heal`/`restoreMana` correctly cap at `maxHp`/`maxMp` (can't
      overheal past max).
- [x] `shield` correctly absorbs incoming damage before HP, correctly
      stacks when cast twice, and correctly lets damage through to HP
      once depleted (including a hit that's larger than the remaining
      shield — partial absorb, remainder hits HP, in the same hit).
      (Barrier x2 → 120 shield; forced a 10-point shield against a bigger
      hit → shield hit 0, exactly `dealt - 10` came off HP in that same
      call; a 999-point shield fully absorbed a hit with zero HP loss.)
- [x] `cleanse` zeroes all five existing status turn counters on its
      target and nothing else (regression check: doesn't touch
      `atkModTurns`/`defModTurns`/`shieldPoints`/`redirectTurns`).
- [x] `drainMana`/`removeShield` correctly floor at 0 (can't go negative).
- [x] `inflictStatus` guarantees the named status every time it's used,
      with no roll involved (100/100 trials, contrasted against the
      existing chance-based infliction which is unaffected and still
      probabilistic). (Toxic Spike: 100/100.)
- [x] A frozen (step 19) fighter that's also debuffed is weaker than
      either effect alone — confirms the multipliers compose rather than
      one overriding the other. (Fixed instance pair, 300-trial averages
      each: baseline 12.5 → frozen-only 9.3 ≈ debuffed-only 9.2 → both
      6.9, clearly lower than either alone.)
- [x] Existing pure-damage-move battles (both 1v1 local and 3v3 online)
      are unaffected — regression check, not just "still compiles." (Also
      ran 50 full battles — 30x 1v1, 20x 3v3 — using freshly-rolled
      instances' real (2-damage+2-support) movesets, randomly picking
      among damage/buff/debuff slots each turn: 0 crashes. Confirmed
      drain/redirect still correctly throw the documented "not executable
      yet (see upgrades/25-26)" error.)
- [x] `npm run build` / `npm run lint` clean.

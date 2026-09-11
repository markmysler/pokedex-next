# Step 42: Battle engine — execute moves against uses, not mana

**Status: shipped**, 2026-09-11. See `main.md`'s "The mana-to-uses
migration" section for the full context and dependency chain.

> Step 40 shipped first and, to keep `npm run build` green after removing
> `mp`/`maxMp`/`mana_cost`, already landed `buildFighterState()`'s
> `moveUses` computation (including the free-move override) exactly as
> specced below. What's still genuinely undone here: `executeMove()` itself
> is a `TODO`-marked no-op that doesn't decrement or reject anything yet —
> that's this step's real remaining scope. See step 40's "what actually
> happened" for the full accounting.

## Why here

Depends on step 40 (the `moveUses`/`max_uses` fields must exist) and step 41
(needs real 3-damage/1-support movesets to exercise, same reasoning as
`archive/v4/main.md`'s "22 before 24/25/26"). This is the step that actually
changes battle *behavior* — 40/41 were data-shape/authoring only.

## What changes

### `buildFighterState()` (`lib/battleEngine.ts`)

Replace the `mp: 100, maxMp: 100` initialization with `moveUses`, computed
per step 40's spec:

```ts
function buildMoveUses(moves: Move[]): (number | null)[] {
  const damageMoves = moves
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.kind === "damage");
  const weakestIndex = damageMoves.length
    ? damageMoves.reduce((a, b) => (b.m.power < a.m.power ? b : a)).i
    : -1;
  return moves.map((m, i) => (i === weakestIndex ? null : m.max_uses));
}
```

(Illustrative — exact implementation may differ, but must produce this
behavior: every instance's lowest-power `damage` move gets `null`
regardless of its catalog `max_uses`, every other move keeps its catalog
value.)

### `executeMove()` (`lib/battleEngine.ts`)

Remove the mana-deduction block:

```ts
// removed:
attackerState.mp = Math.max(0, attackerState.mp - cost);
if (cost === 0) attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + 15);
```

Replace with a uses decrement, only for moves whose `moveUses[moveIndex]`
isn't `null`:

```ts
const movesIdx = attacker.moves.indexOf(move); // or pass the index through explicitly
if (attackerState.moveUses[movesIdx] !== null) {
  attackerState.moveUses[movesIdx] = Math.max(0, attackerState.moveUses[movesIdx]! - 1);
}
```

`executeMove()` currently takes a `Move`, not an index — plumbing the
caster's chosen `moveIndex` through (from `resolveAttack`/`resolveRound`/
`resolveTeamRound`, which already have it via `AttackAction.moveIndex`) is
in scope here, since the uses array is index-addressed.

`moveHeader()`'s cost string (`"-10 MP"` / `"+15 MP Energy Surge!"`) becomes
something like `"2/3 uses"` or `"∞ uses"` — exact copy is this step's call,
but the log line needs to read sensibly with the resource gone.

### Round-start regen (`resolveRound`, `resolveTeamRound`)

Remove both `+15 MP` regen lines entirely —

```ts
// removed from both resolveRound() and resolveTeamRound():
fighter1State.mp = Math.min(fighter1State.maxMp, fighter1State.mp + 15);
fighter2State.mp = Math.min(fighter2State.maxMp, fighter2State.mp + 15);
```

— there's no shared pool left to regenerate; uses only ever go down, reset
only at the next battle's `buildFighterState()`/`buildTeamState()` call.

### What does NOT change in this step

- Damage math, type effectiveness, status effects, buff/debuff/drain/
  redirect execution — all unchanged; this step only touches how a move's
  *castability* is tracked and spent, not what it does once cast.
- The server-side "can this move even be attempted" check in
  `app/api/rooms/[code]/move/route.ts`'s `validateAction()` — step 43.
- Any client-rendered UI (MoveButton/FighterCard/BattleArena/OnlineBattle) —
  step 43. This step can be validated purely by scripting
  `resolveRound`/`resolveTeamRound` directly (same technique
  `archive/v4/21-move-kind-data-model.md` used), no UI needed.

## What actually happened

Implemented per spec, with one deliberate deviation from the file's own
illustrative snippet and one addition beyond its literal text:

**Move-index lookup via reference equality, not explicit threading.**
`executeMove()` locates its own move's slot with a small `findMoveIndex()`
helper (`pokemon.moves.indexOf(move)`) rather than having
`resolveAttack`/`resolveRound`/`resolveTeamRound` all grow an explicit
`moveIndex` parameter. Every call site already threads the literal element
from `pokemon.moves` through unchanged (`resolveTeamRound`'s
`atkState.pokemon.moves[action.moveIndex]`, `resolveRound`'s `move1`/`move2`
params) — reference equality reliably finds the right index with zero
signature changes across three layers of functions, at the cost of an
`indexOf` scan (a 4-element array, irrelevant cost). The step file listed
this as the explicit alternative to full threading ("...or pass the index
through explicitly") — this took that branch.

**The defensive throw is a real throw, not a silent no-op.** A move
reaching `executeMove()` at 0 remaining uses throws
(`caller should not have offered it`) rather than silently proceeding or
quietly no-opping — matches step 21's `assertDamageMove()` precedent for
an invariant that should be structurally impossible once step 43's caller-
side filtering ships, and makes a violation immediately loud during
development rather than a hard-to-trace stat bug.

**Uses-remaining log copy:** `moveHeader()`'s cost string is now
`"${remaining}/${max_uses} uses left"` for a limited-use move (computed
*after* the decrement, mirroring how the old mana string reported the
result of paying the cost) and `"unlimited uses"` for the free move —
covers step 40's placeholder `"max ${max_uses} uses"` text with the real
per-cast remaining count.

**Validation performed:** a throwaway script (scratchpad, not committed)
checked, against the actual transpiled `executeMove`/`resolveRound`/
`resolveTeamRound`: (1) a limited-use move decrements by exactly 1 per
cast down to exactly 0, never negative, and a further cast throws without
an extra decrement; (2) a free move stays `null` across 50 consecutive
casts; (3) 300 full scripted 1v1 battles (`resolveRound`, real rolled
3-damage/1-support movesets, a uses-aware random move-chooser) — 0
crashes, 106 battles actually exhausted at least one limited-use move
mid-battle (the exhaustion path was genuinely exercised, not just
theoretically possible); (4) 200 full scripted 3v3 battles
(`resolveTeamRound`, including naive forced-switch handling) — 0 crashes,
172 with at least one exhaustion. `npm run build` / `npm run lint` both
clean.

## End state

- [x] `buildFighterState()` / `buildTeamState()` initialize `moveUses`
      correctly, including the free-weakest-damage-move override, for
      every instance passed in. (Shipped in step 40; re-exercised here by
      every scripted battle below.)
- [x] `executeMove()` decrements the correct move's `moveUses` entry by 1
      per cast, never going below 0, and never decrements a `null` (free)
      entry. (Verified directly: exact decrement sequence down to 0, and
      50 consecutive free-move casts staying `null`.)
- [x] A move with `moveUses[i] === 0` cannot be executed — `executeMove()`
      either isn't called for it (caller's job, step 43) or defensively
      no-ops/errors if it somehow is (this step's job, as a safety net).
      (Throws; verified directly.)
- [x] No `mp`/`maxMp` regen remains anywhere in `resolveRound()` or
      `resolveTeamRound()`. (Already removed in step 40; re-confirmed —
      0 references to `.mp`/`maxMp` anywhere in `battleEngine.ts`.)
- [x] Scripted battles (1v1 and 3v3, using real rolled 3-damage/1-support
      movesets) play to completion; a battle long enough to exhaust a
      limited-use move's uses correctly falls back to only its remaining
      castable moves (including always the free one) rather than crashing
      or silently allowing an over-limit cast. (500 total scripted
      battles, 0 crashes, 278 with genuine mid-battle exhaustion.)
- [x] `npm run build` / `npm run lint` clean.

# Step 40: Move data model rework — mana_cost → per-battle uses

**Status: shipped**, 2026-09-11. See `main.md`'s "The mana-to-uses migration"
section for the full context and dependency chain.

## Why here

First step of the mana→uses migration — every later step (the pool rebalance,
the battle engine, the UI, the starter/backfill data migrations) needs the new
`Move` shape and `FighterState` fields to exist first. No behavior change in
this step beyond what's needed to keep the app compiling: moves still cost a
resource to cast, it's just counted differently.

## What changes

### The problem with today's resource model

Every move carries a flat `mana_cost: number`, and every `FighterState` has a
shared `mp`/`maxMp` pool (100/100) that regenerates +15 at the start of each
round (`resolveRound`/`resolveTeamRound` in `lib/battleEngine.ts`) and again
whenever a `mana_cost: 0` move is cast (the "Energy Surge" +15 bonus —
currently unused, since no move in the pool actually costs 0). This is a
shared-pool resource: any move can be recast indefinitely as long as the pool
covers it, which is what's being replaced with a **per-move, per-battle use
counter** — an expensive move stops being castable once it's been used its
allotted number of times *this battle*, full stop, regardless of any shared
pool.

### The new `Move` shape (`types/pokemon.ts`)

```ts
interface BaseMove {
  name: string;
  type: PokemonType;
  max_uses: number | null; // null = unlimited this battle; replaces mana_cost
  kind: MoveKind;
}
```

`max_uses` is a flat, tiered attribute of the move itself in the catalog —
same "identical regardless of which Pokemon rolls it" convention
`mana_cost` already followed (see `archive/v4/main.md`'s key decisions). It is
**not** where the "every Pokemon gets one free attack" guarantee lives — that
guarantee is dynamic and per-instance (see below), because which move ends up
being an instance's *weakest* varies with what it actually rolled.

Every existing entry in `lib/data/movePool.ts` (and the `moves` arrays inside
`lib/data/pokedex.json` that seed it) gets `mana_cost` renamed to `max_uses`
with a new value chosen from the tier table below — a mechanical rescale, not
a hand-authored value per move.

**Suggested mana_cost → max_uses tier table** (starting point, tune once
played — same framing this project already uses for e.g. the status-effect
constants in `battleEngine.ts`):

| old mana_cost | new max_uses |
|---|---|
| 5–10 | 5 |
| 15–20 | 4 |
| 22–25 | 3 |
| 28–30 | 2 |
| 35–45 | 1 |

### The free-move guarantee (dynamic, not a catalog field)

> "all pokemon should have at least one attack that can be used freely (their
> weakest one, equivalent to having an attack that consumes zero mana)"

Because moves are drawn from shared pools (`rollMoveset()`), the same move
name can be one instance's strongest damage move and another's weakest —
there's no single catalog move that's *always* the right one to mark
unlimited. So this is computed **at battle-start** (`buildFighterState()`,
step 42's scope to implement, typed here): among an instance's `kind:
"damage"` moves only (not `drain`, which lives in the support pool despite
having `power` — see `main.md`'s key decisions), find the lowest-`power`
entry and treat its uses as unlimited for that battle, overriding whatever
`max_uses` its catalog entry carries. Ties broken by first array occurrence.
Support moves (buff/debuff/drain/redirect) are never the free one — "attack"
here means a damage move, matching `AttackAction`'s own naming and the
DAMAGE_SLOTS/SUPPORT_SLOTS split in `lib/collection.ts`.

### New `FighterState` fields (`types/pokemon.ts`)

```ts
export interface FighterState {
  // ...hp/maxHp/pokemon/bleedTurns/.../shieldPoints/redirectTurns, all untouched...

  // Per-battle remaining uses, index-parallel to pokemon.moves (mirrors how
  // AttackAction.moveIndex already addresses moves by index elsewhere).
  // null = unlimited (either the move's own max_uses is null, or it's this
  // instance's dynamically-chosen free weakest attack for this battle).
  moveUses: (number | null)[];

  // mp / maxMp removed entirely — no shared resource pool left to track.
}
```

`buildFighterState()` initializes `moveUses` from each move's `max_uses`,
then applies the free-move override described above.

### What does NOT change in this step

- `lib/battleEngine.ts`'s actual execution logic — deducting/checking
  `moveUses` instead of `mp` is step 42's job. This step only makes the type
  change compile (temporary casts/TODOs at call sites are fine here, same as
  step 21 did for `assertDamageMove`).
- `lib/collection.ts`'s `DAMAGE_SLOTS`/`SUPPORT_SLOTS` split (still 2/2) —
  that's step 41.
- Starter movesets and already-owned `pokemon_instances` rows — steps 44/46.

## What actually happened

Implemented as specified, plus one real bug found and fixed mid-implementation
that the plan hadn't anticipated:

**The mp-resource support moves.** Three catalog moves and two more read from
or wrote to the now-deleted mp pool that the original plan (`main.md`'s first
draft) didn't flag: `Charge` (buff, `restoreMana`), `Mana Burn`/`Mind Sap`
(debuff, `drainMana`), and `Mind Siphon`/`Energy Drain` (drain,
`resource: "mp"`). Resolved by reassigning each to an existing effect shape
rather than inventing a new uses-based analog: `Charge` → `statUp` (atk,
x1.2, 2 turns); `Mana Burn` → `statDown` (atk, x0.85, 2 turns); `Mind Sap` →
guaranteed `inflictStatus: "blind"` ("sap the mind" → disorientation);
`Mind Siphon`/`Energy Drain` → `resource: "hp"` (same
`percentOfDamageDealt`, now healing HP like every other drain move).
`BuffEffect`/`DebuffEffect` lost the `restoreMana`/`drainMana` variants
entirely, and `DrainMove.drain.resource` is now the literal `"hp"` (no more
union). Documented inline at each reassigned catalog entry and each retired
union member in `types/pokemon.ts`.

**The zero-cost-move collision (the one real bug).** `lib/data/pokedex.json`
already had 4 moves at `mana_cost: 0` (Mud-Slap, Poison Sting, Peck, Lick —
the pre-existing "Energy Surge" special case). First pass mapped
`0 -> max_uses: null` (catalog-level unlimited), which directly collided
with the *dynamic* free-move override on any instance that rolled one of
these 4 alongside a lower-power move: both ended up `null`, breaking the
"exactly one free damage move" guarantee (caught by the validation script
below — 7 species and ~1.3% of 2,000 simulated rolls failed before the fix).
Fixed by mapping `0 -> 5` (the same top tier as mana_cost 5-10) instead,
keeping the free-move guarantee's *only* source of truth the dynamic
per-instance override, per this file's own "free-move guarantee is dynamic,
not a catalog field" section — a catalog-level `null` should never coexist
with it. No catalog move is `max_uses: null` as of this step; `null` only
ever appears at `buildFighterState()` time, dynamically.

**Compiling `lib/battleEngine.ts` and its callers** required going slightly
past "just make it compile" into small pieces of steps 42/43's own listed
scope, since `mp`/`maxMp`/`mana_cost` don't exist anywhere to read from
once removed — there's no way to leave `executeMove()`'s mana-deduction
*lines* in place once the fields they read are gone. What landed here:
`FighterCard.tsx`'s and `AllyTargetPicker.tsx`'s MP meters removed (the
latter wasn't listed in step 43's file — added there as a note for whoever
picks that step up); `BattleArena.tsx`/`OnlineBattle.tsx`'s bot-move
selection and player-facing `insufficientMana` checks switched from a mana
comparison to `moveUses[i] !== 0`; `app/api/rooms/[code]/move/route.ts`'s
`validateAction()` had its mana check removed (now unconditionally passes,
with a `TODO` pointing at 42/43 for the real 0-uses rejection); display
text in `MoveButton.tsx`/`pokemonDisplay.ts`/`InventoryPageClient.tsx`/
`LootboxRevealDialog.tsx` swapped `"X MP"` for `"X uses"`/`"unlimited
uses"`. **Not** done here, still steps 42/43's scope: `executeMove()`
itself still doesn't decrement anything (left as an explicit `TODO`, moves
are effectively unlimited-use at execution time until 42 lands), and the
server route's uses-based rejection is the same kind of stub. Steps 42/43's
own files still have real remaining work; this just means their diffs will
be smaller than originally scoped.

**Validation performed:** a throwaway script (scratchpad, not committed)
transpiled `battleEngine.ts`/`collection.ts`/`pokedex.ts`/`movePool.ts` and
ran directly via Node, checking: all 80 support-pool moves have a valid
`max_uses`; `buildFighterState()` against all 151 species' canonical
movesets computes the correct `moveUses` per-index *and* exactly one free
damage move each; and the same against 2,000 freshly-rolled instances
(`rollMoveset()`, real weighting, all 18 types) — 0 failures after the
zero-cost fix above (26 failures before it). `npm run build` and
`npm run lint` both clean.

## End state

- [x] `types/pokemon.ts` has `max_uses` on `BaseMove` (replacing `mana_cost`)
      and `moveUses: (number | null)[]` on `FighterState` (replacing
      `mp`/`maxMp`), as specified above or a close/justified variant decided
      during implementation.
- [x] Every entry in `lib/data/pokedex.json` (and therefore
      `lib/data/movePool.ts`'s derived catalogs) has `mana_cost` replaced by
      `max_uses` per the tier table, no other field touched. (Plus the three
      mp-resource moves' effects reassigned and the zero-cost tier fix, both
      documented above — no other field/value touched beyond those.)
- [x] `buildFighterState()` computes `moveUses` correctly, including the
      dynamic free-weakest-damage-move override. (2,151 instances validated
      — all 151 species' canonical movesets + 2,000 freshly-rolled — 0
      failures.)
- [x] `npm run build` / `npm run lint` clean — expect every place that read
      `.mana_cost`/`.mp`/`.maxMp` directly to need updating (battleEngine.ts,
      MoveButton.tsx, FighterCard.tsx, BattleArena.tsx, OnlineBattle.tsx,
      pokemonDisplay.ts, InventoryPageClient.tsx, LootboxRevealDialog.tsx,
      app/api/rooms/[code]/move/route.ts — full behavior rework for these is
      steps 42/43, but they need to compile here). (Also
      `AllyTargetPicker.tsx`, not originally listed — see above.)

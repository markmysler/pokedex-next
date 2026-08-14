# Step 23: Guaranteed 2-damage + 2-support move-slot rolling

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

**Known interim gap (mostly closed by steps 24-25; fully closed by step
26):** every newly-rolled instance gets 2 support moves. As of steps
24-25, buff/debuff/drain support moves all execute correctly in a real
battle. Redirect is the only kind that still throws in `battleEngine.ts`
if selected, since nothing executes it until step 26 lands.
Already-rolled instances (from before this step) are unaffected — they
still have 4 damage moves.

## Why here

This is the step that actually delivers "every Pokemon ends up with 2
pure-damage + 2 of the new kinds" — steps 21/22 only made the new moves
exist, nothing yet guarantees any given roll includes them.

## What changes

### Today's `rollMoveset()` (`lib/collection.ts`)

```ts
export function rollMoveset(pokemon: Pick<Pokemon, "type1" | "type2">): Move[] {
  const ownTypes = [pokemon.type1, pokemon.type2].filter(Boolean);
  const ownTypePool = ownTypes.flatMap((t) => movesByType[t] ?? []);
  const picked: Move[] = [];
  const pickedNames = new Set<string>();
  let attempts = 0;
  while (picked.length < MOVE_SLOTS && attempts < MAX_ROLL_ATTEMPTS) {
    attempts++;
    const useOwnType = ownTypePool.length > 0 && Math.random() < SAME_TYPE_CHANCE;
    const pool = useOwnType ? ownTypePool : allMoves;
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (pickedNames.has(candidate.name)) continue;
    pickedNames.add(candidate.name);
    picked.push(candidate);
  }
  return picked;
}
```

A flat loop over one pool (`allMoves`, all damage today) — no concept of
"slot kind." It's reused as-is by `rollBotOpponent`/`rollBotTeam`
(`lib/collection.ts`), so whatever changes here automatically applies to
bot-rolled teams too, no separate change needed there.

### The rework

Replace the single flat loop with two passes over two different pool
sets, same own-type-weighted sampling logic reused for each pass (factor
the existing single-candidate draw into a small shared helper, e.g.
`rollOneMove(pool, poolByType, ownTypes, excludeNames)`, called 4 times
total instead of the current single loop running 4 times over one pool):

- **2 slots from the damage pool** (`allMoves`/`movesByType`) — identical
  behavior to today, unchanged.
- **2 slots from a combined support pool** — `buffMoves ∪ debuffMoves ∪
  drainMoves ∪ redirectMoves` (and their per-type maps unioned the same
  way), each of the 2 slots drawn independently from that combined pool.
  Deliberately *not* one-forced-buff + one-forced-debuff or any finer
  sub-guarantee — the request was "2 of the other ones," not "exactly one
  of each," and forcing finer guarantees would need the pool from step 22
  to be much larger to avoid frequent repeats. Document this as the
  interpretation, flag if the user wants finer control (e.g. "never let
  a Pokemon roll 2 redirect moves") once this is played.
- **Name-dedup stays global across all 4 slots**, not per-pool — a
  Pokemon shouldn't roll the same move name twice even if it happens to
  appear tagged in more than one pool (it shouldn't, per step 22's pools
  being disjoint by kind, but the dedup should be defensive regardless).

### Signature/callers

`rollMoveset()`'s signature and every caller (`rollInstance()`,
`rollBotOpponent()`, `rollBotTeam()`) stay unchanged — this is entirely an
internal rework of the function's body, nothing about "how a moveset gets
rolled" changes from the caller's perspective.

## End state

- [x] `rollMoveset()` always returns exactly 4 moves: exactly 2 with
      `kind: "damage"`, exactly 2 with `kind` in `{buff, debuff, drain,
      redirect}`, verified over many trials (hundreds), not just a single
      call. (2000 trials across random species, 0 shortfalls, always
      exactly 2+2.)
- [x] The existing 85%-own-type / 15%-any-type weighting still holds
      separately for both the damage pass and the support pass (a
      Fire-type Pokemon's 2 support slots lean Fire-flavored buffs/
      debuffs/drain/redirect at roughly the same 85% rate its damage
      slots already do). (Verified with Normal — deep enough own-type
      pools on both sides (5 damage/8 support) to measure cleanly: 85.2%
      damage, 87.8% support over 8000 draws each. A sparse type like Fire
      (only 1 own-type support move) shows a lower *measured* rate for its
      2nd support slot purely because global dedup excludes that single
      move once the 1st slot claims it — a dedup artifact of small pools,
      not a weighting bug; the shared `rollOneMove()` helper applies
      identical logic to both passes by construction.)
- [x] No move name ever repeats within one rolled moveset, across all 4
      slots (regression check on the existing dedup behavior, now spanning
      2 pools instead of 1). (Checked on every trial above — always 4
      unique names.)
- [x] `rollBotOpponent()`/`rollBotTeam()` (bot-side teams, local Battle
      Arena) automatically pick up the same 2-damage+2-support guarantee
      with no code changes of their own — verified, not assumed, since
      they reuse `rollMoveset()`. (100 `rollBotOpponent()` calls + 20
      `rollBotTeam()` calls, all 2+2.)
- [x] Every one of the 18 `PokemonType`s can actually complete a roll
      without hitting `MAX_ROLL_ATTEMPTS` and falling short of 4 moves —
      exercises step 22's "no type structurally unable to roll a support
      move" checklist item for real, at rolling time. (50 rolls per
      mono-type Pokemon across all 18 types, 0 shortfalls — including the
      5 types with zero own-type support moves today (Water, Ground,
      Flying, Rock, Dragon), which correctly fall through to the full
      support pool every time instead of failing.)
- [x] `npm run build` / `npm run lint` clean.

Also verified: a battle using only the 2 damage-move slots off a freshly
-rolled instance still resolves correctly end-to-end (no regression on
the part of rolling this step actually owns); selecting one of the 2 new
support-move slots in a real battle currently throws a clear, expected
error (`assertDamageMove` from step 21) — see "Known interim gap" above.

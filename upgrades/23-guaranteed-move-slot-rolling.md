# Step 23: Guaranteed 2-damage + 2-support move-slot rolling

**Status: planning only — not implemented.** Do not start this step
without an explicit go-ahead; see `main.md`'s "The attack-system rework"
section for the full context and dependency chain. Depends on step 22
(needs real buff/debuff/drain/redirect moves to draw from).

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

- [ ] `rollMoveset()` always returns exactly 4 moves: exactly 2 with
      `kind: "damage"`, exactly 2 with `kind` in `{buff, debuff, drain,
      redirect}`, verified over many trials (hundreds), not just a single
      call.
- [ ] The existing 85%-own-type / 15%-any-type weighting still holds
      separately for both the damage pass and the support pass (a
      Fire-type Pokemon's 2 support slots lean Fire-flavored buffs/
      debuffs/drain/redirect at roughly the same 85% rate its damage
      slots already do).
- [ ] No move name ever repeats within one rolled moveset, across all 4
      slots (regression check on the existing dedup behavior, now spanning
      2 pools instead of 1).
- [ ] `rollBotOpponent()`/`rollBotTeam()` (bot-side teams, local Battle
      Arena) automatically pick up the same 2-damage+2-support guarantee
      with no code changes of their own — verified, not assumed, since
      they reuse `rollMoveset()`.
- [ ] Every one of the 18 `PokemonType`s can actually complete a roll
      without hitting `MAX_ROLL_ATTEMPTS` and falling short of 4 moves —
      exercises step 22's "no type structurally unable to roll a support
      move" checklist item for real, at rolling time.
- [ ] `npm run build` / `npm run lint` clean.

# Step 41: Balance patch — 3 damage + 1 support move-slot rolling

**Status: not started.** See `main.md`'s "The mana-to-uses migration"
section for the full context and dependency chain.

## Why here

Depends on step 40 (moves need `max_uses` before anything re-rolls them
meaningfully). Comes before the battle engine/UI rework (42/43) so those
steps can be built and validated against movesets that already reflect the
new slot split, rather than retrofitted afterward.

## What changes

### The slot split (`lib/collection.ts`)

```ts
const DAMAGE_SLOTS = 3; // was 2
const SUPPORT_SLOTS = 4 - DAMAGE_SLOTS; // was 2, now derives to 1
```

`rollMoveset()`'s loop structure is unchanged — it already loops
`DAMAGE_SLOTS` times against `allMoves`/`movesByType` and `SUPPORT_SLOTS`
times against `supportMoves`/`supportMovesByType`, so this is a two-constant
change, not a rewrite. `MOVE_SLOTS` (4 total) stays the same — this is a
recomposition of the same 4 slots, not a change in moveset size.

This is also the balance-patch half of the migration: today's 2-damage/
2-support kits leaned on support variety (2 independent buff/debuff/drain/
redirect rolls); 3-damage/1-support leans back toward direct damage, with
only one support slot's worth of variety per instance. Combined with step
40's per-move uses caps (rather than a shared regenerating pool), the
intent is a faster, more attrition-based battle pace — matches the request,
no further tuning called for here.

### Uses-tier interaction

No new tier logic needed here beyond what step 40 already assigned — 3
damage slots means 3 chances (well, 2, after the free-weakest-move override
claims one) to run out of uses on a damage move instead of 2, so damage
move `max_uses` values may be worth a second look once played (see
`main.md`'s "tune once played" framing) — flagged for step 47's validation
pass, not resolved here.

### What does NOT change in this step

- Which specific moves exist in `lib/data/movePool.ts` — no new moves
  authored, just a different count drawn from each existing pool.
- `SAME_TYPE_CHANCE` (85%) and `rollOneMove()`'s own-type-weighting logic —
  unaffected by slot count.
- Starters (hardcoded, not rolled via `rollMoveset()`) — step 44.
- Already-owned instances — step 46.

## End state

- [ ] `DAMAGE_SLOTS = 3`, `SUPPORT_SLOTS` derives to `1` in
      `lib/collection.ts`.
- [ ] A large batch of simulated `rollMoveset()` calls (1,000+, spread
      across all 18 types, mono- and dual-type) confirms every roll
      produces exactly 3 damage + 1 support move, with the existing
      85%-own-type weighting still holding statistically for both passes.
- [ ] No `PokemonType` ever fails to complete a 4-move roll under the new
      split (the support pool shrinking to 1 draw per instance doesn't
      change pool *size*, just how many times each type draws from it, so
      this should hold, but re-verify rather than assume).
- [ ] `npm run build` / `npm run lint` clean.

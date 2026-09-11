# Step 41: Balance patch — 3 damage + 1 support move-slot rolling

**Status: shipped**, 2026-09-11. See `main.md`'s "The mana-to-uses
migration" section for the full context and dependency chain.

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

## What actually happened

Implemented exactly as specced — a two-constant change in `lib/collection.ts`
(`DAMAGE_SLOTS = 2` → `3`; `SUPPORT_SLOTS` derives from `4 - DAMAGE_SLOTS`,
so `1`), no other code touched.

**Structural correctness holds perfectly**, but **the "85%-own-type
weighting still holds statistically" checklist item needed a caveat**,
caught by validation rather than assumed: `rollOneMove()`'s dedup logic
(unchanged by this step) can only land on an own-type move as often as that
type actually *has* distinct own-type moves in the pool. `archive/v4/29-
existing-instance-policy-and-validation.md`'s own 85% re-confirmation was
explicitly measured on "a deep-pool type," not averaged across all 18 — a
methodology this step's validation repeated, and it matters more now:

| Damage-pool depth (own-type moves available) | Types | Observed own-type damage rate (3 slots) |
|---|---|---|
| ≥ 3 | Normal, Fire, Water, Grass, Electric, Psychic (6 types) | 0.79–0.83, in line with the nominal 85% (matches `archive/v4`'s 0.861 deep-pool measurement) |
| = 2 | Ice, Fighting, Poison, Ground, Flying, Bug, Rock, Ghost, Dragon, Steel, Fairy (11 types) | ~0.63, capped at the structural ceiling of 2/3 — the 3rd damage slot *must* come from the cross-type pool since there's no 3rd own-type move to draw uniquely |
| = 0 | Dark (1 type) | 0.000 — no Dark-typed damage move exists in the pool at all, true before this step too (2 own-type slots also drew 0% for Dark under the old split; this step didn't cause or change that) |

This is a pre-existing pool-depth characteristic — `rollOneMove()`'s own
logic is untouched, and 11 of 18 types already had exactly 2 own-type
damage moves before this step (satisfying the *old* 2-damage-slot split's
own-type rate at ~100% structurally). Going to 3 damage slots exposes that
shallow depth for the first time, since it's now asking for one more
own-type pick than 11 types can structurally supply. Authoring more
per-type damage moves would fix it but is a content decision outside this
step's own scope (changing the *slot count*, not the pool's *depth*) —
flagged here as a real, worth-knowing consequence of the balance patch
rather than silently claimed as unaffected.

**Validation performed:** a throwaway script (scratchpad, not committed)
ran real `rollMoveset()` calls: 18,000 mono-type rolls (1,000 × 18 types),
3,060 dual-type rolls (10 × every ordered distinct type pair), a 200-roll-
per-type shortfall sweep, and 500 `buildFighterState()` calls against fresh
3-damage/1-support rolls to confirm step 40's free-move guarantee still
holds under the new split. `npm run build` / `npm run lint` both clean.

## End state

- [x] `DAMAGE_SLOTS = 3`, `SUPPORT_SLOTS` derives to `1` in
      `lib/collection.ts`.
- [x] A large batch of simulated `rollMoveset()` calls (1,000+, spread
      across all 18 types, mono- and dual-type) confirms every roll
      produces exactly 3 damage + 1 support move (21,060 rolls, 0
      violations), with the 85%-own-type weighting holding for the 6
      deep-pool types (own-type damage pool depth ≥3) and capping at each
      type's own structural pool-depth ceiling otherwise — see the table
      above, a pre-existing characteristic this step's validation surfaced
      rather than caused.
- [x] No `PokemonType` ever fails to complete a 4-move roll under the new
      split (200 mono-type rolls × 18 types + the 21,060 rolls above: 0
      shortfalls total).
- [x] `npm run build` / `npm run lint` clean.

# Step 46: Backfill — every non-starter owned Pokemon to 3 damage + 1 support, uses-based

**Status: shipped.** See `main.md`'s "The mana-to-uses migration"
section for the full context and dependency chain, and the "all existing
Pokemon are in scope" key decision (this wave has **no** "leave existing
instances alone" default — unlike `archive/v4/29-...md`, that question was
already answered by the user before this plan was written).

## Why here

Depends on 40/41 (the new shape and slot split must exist) and benefits
from 42/43/44 already shipped so the migrated data can be validated by
actually battling with it, not just inspected. Starters are handled
separately in step 44 (different mechanism — hand-authored, not
`rollMoveset()` output); this step is everything else.

## What changes

### The migration, per existing non-starter `pokemon_instances` row

Every such row currently has 2 damage + 2 support moves (post-`archive/
v4/29`'s backfill), all still keyed by `mana_cost`. Bringing each up to
this wave's shape means, per row:

1. Rename `mana_cost` → `max_uses` on all 4 existing move entries, values
   rescaled per step 40's tier table (based on each move's *current*
   `mana_cost` value, looked up by name against the updated
   `lib/data/movePool.ts` catalog — not re-derived from scratch).
2. Keep both existing damage moves as-is (post-rescale).
3. Roll one additional damage move via the real `rollMoveset()`-style
   logic (own-type-weighted, excluding names already in the moveset) to
   fill the new 3rd damage slot.
4. Keep exactly one of the two existing support moves, drop the other
   (deterministic choice — e.g. keep whichever was originally in slot 3,
   drop slot 4 — pick one rule and apply it uniformly, don't re-roll which
   one survives).

This mirrors `archive/v4/29-existing-instance-policy-and-validation.md`'s
precedent as closely as possible (minimal disruption — keep what's already
there, roll only what's newly needed) rather than re-rolling every
instance's moveset wholesale, which would erase movesets players may
already be attached to.

The free-weakest-damage-move override (step 40/42) doesn't need a backfill
column of its own — it's computed at `buildFighterState()` time from
whatever 3 damage moves end up in the `moves` array, so it's automatically
correct for migrated rows the first time they enter a battle post-migration.
No separate "which move is free" field gets persisted.

### Script shape

Same pattern as `archive/v4/29-...md`'s executed backfill: a throwaway
script (scratchpad, not committed) run via `tsx` importing the actual
project modules (real `rollMoveset()`/pool data, not a reimplementation),
against the Supabase secret key.

1. **Dry run** (read-only): count total non-starter `pokemon_instances`
   rows, confirm none are already in the new shape (idempotency check, same
   spirit as `20260814000000_starter_move_kind_fix.sql`'s `where ... not
   (move2 ? 'kind')` guard — this migration should be safe to re-run
   without double-migrating a row).
2. Present the exact count and a sample of before/after diffs to the user;
   get explicit go-ahead for the production write specifically (not
   bundled into general step approval).
3. Execute; re-run the dry-run query afterward and confirm 0 remaining
   candidates.

## What does NOT change in this step

- Starter rows (`is_starter = true`) — step 44's scope entirely, different
  mechanism and different migration file.
- Instance stats (hp/atk/def/spatk/spdef/spd/total) — untouched, this is a
  moveset-only migration.

## What actually happened

Matched the plan's mechanism exactly: a throwaway scratchpad script (not
committed), transpiled from the real `lib/collection.ts`/`lib/data/
movePool.ts`/`lib/pokedex.ts` via the same tsc-transpile-and-run technique
used throughout this wave, run against the Supabase secret key.

**Dry run found 48 non-starter rows**, all still on the old 2-damage+2-
support/`mana_cost` shape (0 already migrated), spanning 37 distinct
species. The "keep support slot 3, drop slot 4" rule from the plan was
implemented as: sort the row's 2 support moves by their original array
index, keep the lower one, drop the higher — deterministic, matches the
plan's own wording exactly.

**A finding beyond the plan's original scope:** the value-rescale step
("looked up by name against the updated catalog, not re-derived from
scratch") means every kept move gets its whole object replaced by the
catalog's *current* definition for that name, not just its `mana_cost`
key renamed in place. This turned out to matter beyond just `max_uses`:
7 of the 48 rows carried one of the 5 support moves whose *effect* was
reassigned during step 40 (`Charge`, `Mana Burn`, `Mind Sap`, `Mind
Siphon`, `Energy Drain`) — and all 7 still had the literal stale
pre-reassignment effect data persisted in their `moves` JSONB (e.g. a
`Mind Siphon` row reading `drain.resource: "mp"`, a resource that no
longer exists anywhere in the engine). This was a real dangling-data bug
introduced by step 40 (which only updated the *catalog*, not already-
persisted instances) that nothing in the original plan had flagged. The
catalog-lookup-by-name rescale mechanism fixes it automatically as a
side effect, for every affected row, whether the move ended up kept or
dropped — confirmed by re-checking the computed plan before writing (0
of the 7 retained stale data) and, for a stricter guarantee, in a
follow-up query after the write.

**The 3rd damage move was rolled by calling the real, unmodified
`rollMoveset()`** (not a reimplementation, not an exported-just-for-this
helper) with the row's own species `type1`/`type2`, taking the first
`kind: "damage"` entry in its 3-damage output not already present in the
row's final name set (retrying the whole call, up to 20 times, on the
rare case all 3 collide) — this reuses the exact same 85%-own-type
weighting every other roll in the game uses, with no duplicate code path.

**Presented the exact count (48) and 5 sample before/after diffs to the
user** before writing anything, per this step's own required process
(mirroring step 44's); got explicit go-ahead specifically for the
production write. Applied via individual `update()` calls per row (no
batch/bulk endpoint needed at this volume): 48 succeeded, 0 failed.
Re-ran the dry-run query afterward: 0 rows remain on the old shape, 48/48
on the new one.

**Battle spot-check**: fetched 6 of the freshly migrated rows and ran them
through the real `buildFighterState()`/`resolveRound()`/`resolveTeamRound()`
— 5 1v1 pairings to exhaustion (0 crashes, 3 with a move genuinely
depleted mid-battle) plus one 3v3 (21 rounds, completed cleanly). Every
fighter's free move (the dynamically-computed weakest damage move)
confirmed never depleted across all pairings. `npm run build` / `npm run
lint` clean (no source files changed this step — data-only migration).

## End state

- [x] Dry-run script counts every non-starter `pokemon_instances` row and
      confirms the pre-migration shape (2 damage + 2 support, `mana_cost`
      keyed) for all of them before any write happens. (48 rows, 100%
      matching the expected shape.)
- [x] Exact count and change plan presented to the user; explicit
      go-ahead obtained for the production write before executing.
- [x] Every non-starter row migrated to 3 damage + 1 support, `max_uses`
      keyed, with the 2 kept-as-is damage moves and 1 kept-as-is support
      move unchanged in name/effect (only their `max_uses` value changes),
      and the 2 newly-added/removed slots filled per the rules above.
      (Also fixed 7 rows' stale mp-effect data as a side effect of the
      catalog-lookup rescale — see "What actually happened".)
- [x] Re-run of the dry-run query post-migration finds 0 remaining
      candidates. (0/48 on the old shape, 48/48 on the new shape.)
- [x] A handful of migrated instances spot-checked in a real battle
      (1v1 and 3v3) play correctly — all 4 moves castable per their uses,
      free move never runs out. (6 real migrated instances, 5 1v1 + 1
      3v3, 0 crashes, free move never depleted in any pairing.)
- [x] `main.md`'s step table updated to mark shipped steps once this and
      the rest of the wave's checks pass.
- [x] `npm run build` / `npm run lint` clean.

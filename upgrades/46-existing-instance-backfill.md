# Step 46: Backfill — every non-starter owned Pokemon to 3 damage + 1 support, uses-based

**Status: not started.** See `main.md`'s "The mana-to-uses migration"
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

## End state

- [ ] Dry-run script counts every non-starter `pokemon_instances` row and
      confirms the pre-migration shape (2 damage + 2 support, `mana_cost`
      keyed) for all of them before any write happens.
- [ ] Exact count and change plan presented to the user; explicit
      go-ahead obtained for the production write before executing.
- [ ] Every non-starter row migrated to 3 damage + 1 support, `max_uses`
      keyed, with the 2 kept-as-is damage moves and 1 kept-as-is support
      move unchanged in name/effect (only their `max_uses` value changes),
      and the 2 newly-added/removed slots filled per the rules above.
- [ ] Re-run of the dry-run query post-migration finds 0 remaining
      candidates.
- [ ] A handful of migrated instances spot-checked in a real battle
      (1v1 and 3v3) play correctly — all 4 moves castable per their uses,
      free move never runs out.
- [ ] `main.md`'s step table updated to mark shipped steps once this and
      the rest of the wave's checks pass.
- [ ] `npm run build` / `npm run lint` clean.

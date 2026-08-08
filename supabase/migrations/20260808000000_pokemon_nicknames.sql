-- Step 8 of the upgrade path (see pokedex-next/upgrades/08-pokemon-nicknames.md):
-- lets an owner rename an individual Pokemon instance. Nullable -- null means
-- "no nickname," falls back to the species name everywhere. No backfill
-- needed, existing rows are already null which is the correct unnamed state.
-- App-level validation only (1-24 chars after trimming), matching this
-- codebase's existing preference for no DB-level check constraints on
-- free-text-ish columns (e.g. battle_rooms.status).
alter table pokemon_instances add column nickname text;

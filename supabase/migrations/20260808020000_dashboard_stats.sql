-- Step 13 of the upgrade path (see pokedex-next/upgrades/13-dashboard-stats.md):
-- a durable "Pokemon released" counter. Discarding permanently DELETEs the
-- pokemon_instances row, so there's no history to count after the fact --
-- this one counter is the only new state needed. Named "released," not
-- "discarded," on purpose: step 14's trade-up burns Pokemon too and will
-- increment this same counter, so the stat stays meaningful regardless of
-- which mechanism was used.
alter table profiles add column pokemon_released_count int not null default 0;

-- Single-statement atomic increment -- supabase-js's .update() can only set
-- literal values, not "column + 1" expressions, so a read-modify-write in
-- application code would race under concurrent discards. This function's
-- one UPDATE is serialized per-row by Postgres like every other atomic
-- mutation in this schema (submit_move, accept_trade).
create or replace function public.increment_released_count(p_user_id uuid)
returns void
language sql
as $$
  update profiles
  set pokemon_released_count = pokemon_released_count + 1
  where user_id = p_user_id;
$$;

-- Called only from DELETE /api/inventory/pokemon/[id] with the secret key --
-- same grants-not-inherited caveat as every other function in this schema.
grant execute on function public.increment_released_count(uuid) to service_role;

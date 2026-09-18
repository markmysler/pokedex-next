-- Step 50 of the upgrade path (see pokedex-next/upgrades/50-evolution-db-
-- migration-and-rpc.md): burn 5 owned, non-starter, same-species Pokemon for
-- exactly 1 evolved instance. Atomicity matters the same way it does for
-- trade_up_pokemon() (20260808030000_pokemon_tradeup.sql) -- a partial
-- failure must never burn the 5 without creating the evolved instance, or
-- vice versa, so this is one Postgres function rather than a sequence of
-- Route-Handler-side calls.
--
-- Stats/moveset arrive as parameters, already computed by lib/evolution.ts
-- (step 49) Route-Handler-side (step 51) -- this function inserts
-- pre-computed values, it doesn't compute them itself, same division of
-- labor the handle_new_user starter seed already establishes. The
-- species-match check (v_source_number) is new relative to Trade Up, which
-- doesn't care what species the 5 are -- evolution does.
create or replace function evolve_pokemon(
  p_user_id uuid,
  p_instance_ids uuid[],
  p_target_number text,
  p_stats jsonb, -- {hp, atk, def, spatk, spdef, spd, total} from step 49
  p_moves jsonb  -- the freshly-rolled moveset from step 49
)
returns uuid -- the new instance's id
language plpgsql
security definer set search_path = public
as $$
declare
  v_source_number text;
  v_count int;
  v_new_id uuid;
begin
  if array_length(p_instance_ids, 1) is distinct from 5 then
    raise exception 'Exactly 5 Pokemon are required';
  end if;

  -- Re-validates ownership/starter-status/species-match *inside* the
  -- function against p_instance_ids directly (never trusts a pre-check the
  -- client or Route Handler already did) -- same "re-validate at execution
  -- time" principle trade_up_pokemon and accept_trade already use.
  select pokemon_number into v_source_number
  from pokemon_instances
  where id = any(p_instance_ids) and user_id = p_user_id and is_starter = false
  limit 1;

  select count(*) into v_count
  from pokemon_instances
  where id = any(p_instance_ids)
    and user_id = p_user_id
    and is_starter = false
    and pokemon_number = v_source_number;

  if v_count is distinct from 5 then
    raise exception 'One or more Pokemon are not eligible (not owned, a starter, or not all the same species)';
  end if;

  delete from pokemon_instances where id = any(p_instance_ids);

  insert into pokemon_instances
    (user_id, pokemon_number, hp, atk, def, spatk, spdef, spd, total, moves, is_starter)
  values (
    p_user_id, p_target_number,
    (p_stats->>'hp')::int, (p_stats->>'atk')::int, (p_stats->>'def')::int,
    (p_stats->>'spatk')::int, (p_stats->>'spdef')::int, (p_stats->>'spd')::int,
    (p_stats->>'total')::int, p_moves, false
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Called only from POST /api/inventory/evolve (step 51) with the secret
-- key -- same grants-not-inherited caveat every other function in this
-- schema notes.
--
-- IMPORTANT, discovered validating this step against a local instance:
-- Supabase's default schema privileges grant EXECUTE on every new public-
-- schema function to `anon`/`authenticated` automatically (confirmed via
-- pg_proc.proacl), on top of Postgres's own PUBLIC-execute default --
-- *neither* is revoked by the `grant ... to service_role` pattern every
-- prior migration in this file uses (that grant is additive, not
-- exclusive). This function explicitly revokes both, so it isn't callable
-- by anyone holding only the public anon key -- verified live (see step
-- 50's "What actually happened"). The same gap affects every pre-existing
-- security-definer RPC in this schema (trade_up_pokemon, accept_trade,
-- submit_move, ...); flagged separately, out of this step's scope to fix
-- retroactively.
revoke execute on function public.evolve_pokemon(uuid, uuid[], text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.evolve_pokemon(uuid, uuid[], text, jsonb, jsonb) to service_role;

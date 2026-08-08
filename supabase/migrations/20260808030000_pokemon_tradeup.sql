-- Step 14 of the upgrade path (see pokedex-next/upgrades/14-pokemon-tradeup.md):
-- burn 5 owned, non-starter Pokemon for exactly 1 lootbox. Atomicity matters
-- the same way it does for step 12's accept_trade -- a partial failure must
-- never burn Pokemon without granting the lootbox, or vice versa, so this is
-- one Postgres function rather than a sequence of Route-Handler-side calls.
create or replace function trade_up_pokemon(p_user_id uuid, p_instance_ids uuid[])
returns uuid -- the new lootbox's id
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_lootbox_id uuid;
begin
  if array_length(p_instance_ids, 1) is distinct from 5 then
    raise exception 'Exactly 5 Pokemon are required';
  end if;

  -- Re-validates ownership/starter-status *inside* the function against
  -- p_instance_ids directly (never trusts a pre-check the client or Route
  -- Handler already did) -- an inventory can change between the client
  -- picking 5 and the request landing, same "re-validate at execution time"
  -- principle accept_trade (step 12) uses.
  select count(*) into v_count
  from pokemon_instances
  where id = any(p_instance_ids) and user_id = p_user_id and is_starter = false;

  if v_count is distinct from 5 then
    raise exception 'One or more Pokemon are not eligible (not owned, or a starter)';
  end if;

  delete from pokemon_instances where id = any(p_instance_ids);

  insert into lootboxes (user_id) values (p_user_id) returning id into v_lootbox_id;

  update profiles set pokemon_released_count = pokemon_released_count + 5
  where user_id = p_user_id;

  return v_lootbox_id;
end;
$$;

-- Called only from POST /api/inventory/tradeup with the secret key -- same
-- grants-not-inherited caveat as every other function in this schema.
grant execute on function public.trade_up_pokemon(uuid, uuid[]) to service_role;

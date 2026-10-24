-- Atomic lootbox opening.
--
-- Opening used to be two steps from the Route Handler: claim the box
-- (opened_at), then insert the rolled Pokemon. If the insert failed, the
-- box was spent with nothing granted; open-many claimed N boxes and then
-- inserted one at a time, so a failure part-way lost the rest. The Route
-- Handler still rolls the Pokemon (lib/collection.ts), but claiming and
-- inserting now happen in one transaction: either the box is opened and
-- the Pokemon exists, or neither.

create or replace function public.insert_rolled_instance(p_user_id uuid, p_instance jsonb)
returns pokemon_instances
language sql
as $$
  insert into pokemon_instances (user_id, pokemon_number, hp, atk, def, spatk, spdef, spd, total, moves, is_starter)
  values (
    p_user_id,
    p_instance->>'pokemon_number',
    (p_instance->>'hp')::int,
    (p_instance->>'atk')::int,
    (p_instance->>'def')::int,
    (p_instance->>'spatk')::int,
    (p_instance->>'spdef')::int,
    (p_instance->>'spd')::int,
    (p_instance->>'total')::int,
    p_instance->'moves',
    false
  )
  returning *;
$$;

-- Opens one specific lootbox. Returns no row if it doesn't exist, isn't the
-- caller's, or is already opened (the route then explains which).
create or replace function public.open_lootbox(p_lootbox_id uuid, p_user_id uuid, p_instance jsonb)
returns setof pokemon_instances
language plpgsql
as $$
begin
  update lootboxes
  set opened_at = now()
  where id = p_lootbox_id
    and user_id = p_user_id
    and opened_at is null;
  if not found then
    return;
  end if;
  return next public.insert_rolled_instance(p_user_id, p_instance);
end;
$$;

-- Opens as many of the caller's unopened lootboxes as there are rolled
-- instances in p_instances (oldest first), skipping rows another request
-- has locked, exactly like claim_lootboxes. Returns the new instances.
create or replace function public.open_lootboxes(p_user_id uuid, p_instances jsonb)
returns setof pokemon_instances
language plpgsql
as $$
declare
  v_box record;
  v_index int := 0;
begin
  for v_box in
    select id from lootboxes
    where user_id = p_user_id and opened_at is null
    order by created_at asc
    limit jsonb_array_length(p_instances)
    for update skip locked
  loop
    update lootboxes set opened_at = now() where id = v_box.id;
    return next public.insert_rolled_instance(p_user_id, p_instances->v_index);
    v_index := v_index + 1;
  end loop;
end;
$$;

revoke execute on function public.insert_rolled_instance(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.open_lootbox(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.open_lootboxes(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.insert_rolled_instance(uuid, jsonb) to service_role;
grant execute on function public.open_lootbox(uuid, uuid, jsonb) to service_role;
grant execute on function public.open_lootboxes(uuid, jsonb) to service_role;

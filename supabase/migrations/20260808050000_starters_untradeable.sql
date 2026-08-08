-- Starters (is_starter = true) must never leave their original owner --
-- neither via discard (enforced in the DELETE /api/inventory/pokemon/[id]
-- Route Handler) nor via friend trading. The propose-time check
-- (POST /api/friends/[id]/trade) already rejects a starter in either the
-- offered or requested list, but accept_trade() is the actual enforcement
-- point (re-validates at execution time, never trusts a pre-check -- same
-- principle this function's own existing comment already states, and the
-- same one trade_up_pokemon() (step 14) uses for the identical exclusion).
-- is_starter is immutable once a pokemon_instances row is created, so this
-- isn't closing a race window, just making the DB-level guarantee match
-- what the route already enforces, the same defense-in-depth posture every
-- other security definer function in this schema has.
create or replace function accept_trade(p_trade_id uuid, p_accepting_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_trade trade_offers%rowtype;
  v_friendship friendships%rowtype;
  v_offering_id uuid;
  v_requesting_id uuid;
  v_offered_ids uuid[];
  v_requested_ids uuid[];
  v_offered_count int;
  v_requested_count int;
begin
  select * into v_trade from trade_offers where id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if v_trade.status <> 'pending' then
    raise exception 'This trade is no longer pending';
  end if;

  select * into v_friendship from friendships where id = v_trade.friendship_id;
  if not found or v_friendship.status <> 'accepted' then
    raise exception 'This friendship is no longer active';
  end if;

  v_offering_id := v_trade.offered_by;
  v_requesting_id := case
    when v_friendship.requester_id = v_offering_id then v_friendship.addressee_id
    else v_friendship.requester_id
  end;

  if p_accepting_user_id <> v_requesting_id then
    raise exception 'Only the other friend can accept this trade';
  end if;

  v_offered_ids := array(select jsonb_array_elements_text(v_trade.offered_instance_ids))::uuid[];
  v_requested_ids := array(select jsonb_array_elements_text(v_trade.requested_instance_ids))::uuid[];

  select count(*) into v_offered_count from pokemon_instances where id = any(v_offered_ids) and user_id = v_offering_id and is_starter = false;
  if v_offered_count is distinct from array_length(v_offered_ids, 1) then
    raise exception 'One or more offered Pokemon are no longer available';
  end if;

  select count(*) into v_requested_count from pokemon_instances where id = any(v_requested_ids) and user_id = v_requesting_id and is_starter = false;
  if v_requested_count is distinct from array_length(v_requested_ids, 1) then
    raise exception 'One or more requested Pokemon are no longer available';
  end if;

  update pokemon_instances set user_id = v_requesting_id where id = any(v_offered_ids);
  update pokemon_instances set user_id = v_offering_id where id = any(v_requested_ids);

  update trade_offers set status = 'accepted', resolved_at = now() where id = p_trade_id;
end;
$$;

grant execute on function accept_trade(uuid, uuid) to service_role;

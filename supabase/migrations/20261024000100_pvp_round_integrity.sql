-- PvP round integrity.
--
-- 1. submit_move only records a move while the room is battling, the battle
--    isn't over, no forced switch is pending, and this slot hasn't already
--    moved this round. Before, a player could overwrite their move after the
--    opponent's was in, and a late resubmit could make two requests both see
--    "both moves pending" and resolve the same round twice.
-- 2. finalize_round_at_turn only writes the new state if the room is still
--    on the turn the caller resolved from. Whichever request resolves a
--    round first wins; the other gets NULL back and must not record
--    anything. (The old two-argument finalize_round stays for one release
--    so the currently deployed code keeps working while this migration and
--    the new code roll out; drop it afterwards.)
-- 3. record_online_battle_end flips the room to 'over' and writes the
--    lootbox and both match_results rows in one transaction, and only if
--    the room was still battling. A battle can no longer pay out twice, and
--    a failure part-way can't leave a lootbox without its match rows.
--    Passing p_final_state is the forfeit path (a player leaving mid-battle):
--    it only applies while the battle state isn't already over, so a leave
--    racing the final round can't overwrite a real result.

create or replace function public.submit_move(p_code text, p_slot int, p_move jsonb)
returns jsonb
language sql
as $$
  update battle_rooms
  set state = jsonb_set(
    coalesce(state, '{}'::jsonb),
    array['pending', p_slot::text],
    p_move
  )
  where code = p_code
    and status = 'battling'
    and not coalesce((state->>'over')::boolean, false)
    and state->>'awaitingForcedSwitch' is null
    and not (coalesce(state->'pending', '{}'::jsonb) ? p_slot::text)
  returning state;
$$;

create or replace function public.finalize_round_at_turn(p_code text, p_expected_turn int, p_new_state jsonb)
returns jsonb
language sql
as $$
  update battle_rooms
  set state = p_new_state
  where code = p_code
    and status = 'battling'
    and (state->>'turnCount')::int = p_expected_turn
  returning state;
$$;

create or replace function public.record_online_battle_end(
  p_code text,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_team jsonb,
  p_loser_team jsonb,
  p_final_state jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  v_lootbox_id uuid;
begin
  update battle_rooms
  set status = 'over',
      state = coalesce(p_final_state, state)
  where code = p_code
    and status = 'battling'
    and (p_final_state is null or not coalesce((state->>'over')::boolean, false));
  if not found then
    return jsonb_build_object('recorded', false, 'lootbox_id', null);
  end if;

  if p_winner_id is not null then
    insert into lootboxes (user_id) values (p_winner_id) returning id into v_lootbox_id;
    insert into match_results (user_id, opponent, mode, won, room_code, team_snapshot)
    values (p_winner_id, coalesce(p_loser_id::text, 'unknown'), 'online', true, p_code, p_winner_team);
  end if;
  if p_loser_id is not null then
    insert into match_results (user_id, opponent, mode, won, room_code, team_snapshot)
    values (p_loser_id, coalesce(p_winner_id::text, 'unknown'), 'online', false, p_code, p_loser_team);
  end if;

  return jsonb_build_object('recorded', true, 'lootbox_id', v_lootbox_id);
end;
$$;

-- Service-role only, per the convention in 20260918010000_rpc_execute_lockdown.sql:
-- every new function revokes the PUBLIC/anon/authenticated defaults explicitly.
revoke execute on function public.finalize_round_at_turn(text, int, jsonb) from public, anon, authenticated;
revoke execute on function public.record_online_battle_end(text, uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_round_at_turn(text, int, jsonb) to service_role;
grant execute on function public.record_online_battle_end(text, uuid, uuid, jsonb, jsonb, jsonb) to service_role;

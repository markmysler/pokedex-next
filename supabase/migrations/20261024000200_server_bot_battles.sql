-- Server-side bot battles.
--
-- Bot battles used to run entirely in the browser, which then reported
-- POST /api/battles/bot-result { won: true }. Nothing checked that a battle
-- had happened, so a loop of that request was a lootbox 60% of the time,
-- without limit. Now the server owns the battle the same way it owns online
-- rooms: it builds both teams from the database, resolves every round with
-- the shared engine, and decides the result itself.
--
-- One row per battle. The browser roles get nothing (see
-- 20261024000000_table_access_lockdown.sql); Route Handlers use service_role.

create table bot_battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'battling' check (status in ('battling', 'over', 'abandoned')),
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bot_battles_user_status_idx on bot_battles(user_id, status);

alter table bot_battles enable row level security;
revoke all on table public.bot_battles from anon, authenticated;
grant all on table public.bot_battles to service_role;

-- Saves a resolved round only if the battle is still on the turn the caller
-- resolved from, so two requests for the same turn can't both apply.
create or replace function public.save_bot_round(p_id uuid, p_user_id uuid, p_expected_turn int, p_new_state jsonb)
returns jsonb
language sql
as $$
  update bot_battles
  set state = p_new_state, updated_at = now()
  where id = p_id
    and user_id = p_user_id
    and status = 'battling'
    and (state->>'turnCount')::int = p_expected_turn
  returning state;
$$;

-- Ends the battle and writes its match_results row and, when the caller
-- rolled one, the lootbox, in one transaction and only once per battle.
create or replace function public.finish_bot_battle(
  p_id uuid,
  p_user_id uuid,
  p_expected_turn int,
  p_new_state jsonb,
  p_won boolean,
  p_grant_lootbox boolean,
  p_team jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_lootbox_id uuid;
begin
  update bot_battles
  set state = p_new_state, status = 'over', updated_at = now()
  where id = p_id
    and user_id = p_user_id
    and status = 'battling'
    and (state->>'turnCount')::int = p_expected_turn;
  if not found then
    return jsonb_build_object('recorded', false, 'lootbox_id', null);
  end if;

  insert into match_results (user_id, opponent, mode, won, team_snapshot)
  values (p_user_id, 'bot', 'bot', p_won, p_team);

  if p_won and p_grant_lootbox then
    insert into lootboxes (user_id) values (p_user_id) returning id into v_lootbox_id;
  end if;

  return jsonb_build_object('recorded', true, 'lootbox_id', v_lootbox_id);
end;
$$;

revoke execute on function public.save_bot_round(uuid, uuid, int, jsonb) from public, anon, authenticated;
revoke execute on function public.finish_bot_battle(uuid, uuid, int, jsonb, boolean, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.save_bot_round(uuid, uuid, int, jsonb) to service_role;
grant execute on function public.finish_bot_battle(uuid, uuid, int, jsonb, boolean, boolean, jsonb) to service_role;

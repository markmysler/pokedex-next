-- Database tests: run against a database with every migration applied.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database.sql
-- (CI does this on a fresh `supabase db start`.) Everything runs in one
-- transaction that is rolled back, so it leaves no data behind. Each check
-- raises an exception on failure, which stops psql with a non-zero exit.

begin;

-- Two players. The signup trigger creates their profiles, starters and
-- signup lootbox.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid', '{"display_name":"Bob"}');

-- 1. Browser roles hold no privileges on any table in public.
do $$
declare leaked text;
begin
  select string_agg(distinct table_name || ':' || grantee || ':' || privilege_type, ', ') into leaked
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated');
  if leaked is not null then raise exception 'FAIL table privileges for browser roles: %', leaked; end if;
end $$;

-- 2. No public function is executable by anon, and the only one
--    `authenticated` may run is the Realtime topic check.
do $$
declare leaked text;
begin
  select string_agg(p.proname || ':' || r.rolname, ', ') into leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where has_function_privilege(r.rolname, p.oid, 'execute')
    and not (p.proname = 'can_use_realtime_topic' and r.rolname = 'authenticated');
  if leaked is not null then raise exception 'FAIL functions executable by browser roles: %', leaked; end if;
end $$;

-- 3. A signed-in player can't write game tables directly (the PostgREST
--    path with the publishable key and their own session).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare
  t text;
begin
  foreach t in array array['pokemon_instances', 'lootboxes', 'match_results', 'friendships', 'profiles'] loop
    begin
      execute format('select 1 from public.%I limit 1', t);
      raise exception 'FAIL authenticated could read %', t;
    exception when insufficient_privilege then
      null; -- expected
    end;
  end loop;
  begin
    insert into public.lootboxes (user_id) values ('00000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL authenticated could insert a lootbox';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 8 (as authenticated). Realtime topics: your own user topic only, rooms and
--    friendships only as a member.
do $$
begin
  if not public.can_use_realtime_topic('user:00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL own user topic denied';
  end if;
  if public.can_use_realtime_topic('user:00000000-0000-0000-0000-00000000000b') then
    raise exception 'FAIL another user''s topic allowed';
  end if;
  if public.can_use_realtime_topic('room:NOPE00') then
    raise exception 'FAIL unknown room allowed';
  end if;
end $$;
reset role;

-- 4. PvP: one move per player per round, and a round is written once.
insert into battle_rooms (code, player1_id, player2_id, status, state)
values ('TEST01', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'battling',
        '{"team1":{},"team2":{},"pending":{},"awaitingForcedSwitch":null,"turnCount":0,"over":false,"winner":null}');
do $$
begin
  if public.submit_move('TEST01', 1, '{"type":"attack","moveIndex":0}') is null then
    raise exception 'FAIL first move rejected';
  end if;
  if public.submit_move('TEST01', 1, '{"type":"attack","moveIndex":1}') is not null then
    raise exception 'FAIL second move for the same slot accepted';
  end if;
  if public.submit_move('TEST01', 2, '{"type":"attack","moveIndex":0}') is null then
    raise exception 'FAIL opponent move rejected';
  end if;
  if public.finalize_round_at_turn('TEST01', 0, '{"pending":{},"turnCount":1,"over":false,"awaitingForcedSwitch":null}') is null then
    raise exception 'FAIL first finalize rejected';
  end if;
  if public.finalize_round_at_turn('TEST01', 0, '{"pending":{},"turnCount":1,"over":false,"awaitingForcedSwitch":null}') is not null then
    raise exception 'FAIL same turn finalized twice';
  end if;
end $$;

-- Room membership for Realtime, checked as each player.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
begin
  if not public.can_use_realtime_topic('room:TEST01') then raise exception 'FAIL room player denied'; end if;
  if not public.can_use_realtime_topic('room-chat:TEST01') then raise exception 'FAIL room chat player denied'; end if;
end $$;

-- Sending: Realtime decides once per join whether a client may send, by
-- inserting a probe row with only topic and extension set (no event), the
-- way these inserts do. Players may send on room-chat:<code> only, never on
-- room:<code>, where they could fake game events.
do $$
declare
  t text;
  sent boolean;
begin
  foreach t in array array['room-chat:TEST01', 'room:TEST01', 'room-chat:NOPE00'] loop
    perform set_config('realtime.topic', t, true);
    begin
      insert into realtime.messages (topic, extension) values (t, 'broadcast');
      sent := true;
    exception
      when insufficient_privilege then sent := false;
      -- With only `supabase db start` (CI), Realtime hasn't created
      -- today's partition of realtime.messages, so the probe can't run.
      when check_violation then
        raise notice 'skipping Realtime send check for %: no realtime.messages partition', t;
        continue;
    end;
    if sent <> (t = 'room-chat:TEST01') then
      raise exception 'FAIL room player send on % allowed=%', t, sent;
    end if;
  end loop;
end $$;
reset role;

-- The send policy can't depend on the event: the join-time probe has none.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'realtime' and tablename = 'messages' and cmd = 'INSERT'
      and with_check ~ '\mevent\M'
  ) then
    raise exception 'FAIL a realtime.messages insert policy checks event, which Realtime never sets at join';
  end if;
end $$;

-- Someone outside the room can't use its chat topic.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
begin
  if public.can_use_realtime_topic('room-chat:TEST01') then raise exception 'FAIL room chat allowed to non-player'; end if;
end $$;
reset role;

-- 5. A finished online battle pays out exactly once.
do $$
declare
  first_result jsonb;
  second_result jsonb;
  boxes int;
  matches int;
begin
  select count(*) into boxes from lootboxes where user_id = '00000000-0000-0000-0000-00000000000a';
  first_result := public.record_online_battle_end('TEST01', '00000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-00000000000b', '[]', '[]');
  second_result := public.record_online_battle_end('TEST01', '00000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-00000000000b', '[]', '[]');
  if not (first_result->>'recorded')::boolean or (second_result->>'recorded')::boolean then
    raise exception 'FAIL battle end recorded % then %', first_result, second_result;
  end if;
  if (select count(*) from lootboxes where user_id = '00000000-0000-0000-0000-00000000000a') <> boxes + 1 then
    raise exception 'FAIL winner did not get exactly one lootbox';
  end if;
  select count(*) into matches from match_results where room_code = 'TEST01';
  if matches <> 2 then raise exception 'FAIL expected 2 match rows, got %', matches; end if;
end $$;

-- A forfeit can't overwrite a battle whose state is already over.
insert into battle_rooms (code, player1_id, player2_id, status, state)
values ('TEST02', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'battling',
        '{"turnCount":3,"over":true,"winner":1}');
do $$
begin
  if (public.record_online_battle_end('TEST02', '00000000-0000-0000-0000-00000000000a',
      '00000000-0000-0000-0000-00000000000b', '[]', '[]', '{"over":true,"winner":2}')->>'recorded')::boolean then
    raise exception 'FAIL forfeit overwrote a finished battle';
  end if;
end $$;

-- 6. A bot battle pays out once, and only on the expected turn.
insert into bot_battles (id, user_id, state)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', '{"turnCount":4}');
do $$
begin
  if public.save_bot_round('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 4, '{"turnCount":5}') is not null then
    raise exception 'FAIL another user saved a round';
  end if;
  if public.save_bot_round('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 3, '{"turnCount":5}') is not null then
    raise exception 'FAIL stale turn saved';
  end if;
  if not (public.finish_bot_battle('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 4,
      '{"turnCount":5,"over":true}', true, true, '[]')->>'recorded')::boolean then
    raise exception 'FAIL bot battle did not finish';
  end if;
  if (public.finish_bot_battle('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 4,
      '{"turnCount":5,"over":true}', true, true, '[]')->>'recorded')::boolean then
    raise exception 'FAIL bot battle finished twice';
  end if;
end $$;

-- 7. Opening lootboxes is all-or-nothing and only once per box.
do $$
declare
  box uuid;
  instance jsonb := '{"pokemon_number":"025","hp":40,"atk":50,"def":40,"spatk":50,"spdef":50,"spd":90,"total":320,"moves":[]}';
  opened int;
begin
  insert into lootboxes (user_id) values ('00000000-0000-0000-0000-00000000000b') returning id into box;
  select count(*) into opened from public.open_lootbox(box, '00000000-0000-0000-0000-00000000000a', instance);
  if opened <> 0 then raise exception 'FAIL opened someone else''s lootbox'; end if;
  select count(*) into opened from public.open_lootbox(box, '00000000-0000-0000-0000-00000000000b', instance);
  if opened <> 1 then raise exception 'FAIL could not open own lootbox'; end if;
  select count(*) into opened from public.open_lootbox(box, '00000000-0000-0000-0000-00000000000b', instance);
  if opened <> 0 then raise exception 'FAIL opened the same lootbox twice'; end if;

  -- A bad instance fails the insert, and the box must stay unopened.
  insert into lootboxes (user_id) values ('00000000-0000-0000-0000-00000000000b') returning id into box;
  begin
    perform public.open_lootbox(box, '00000000-0000-0000-0000-00000000000b', '{"pokemon_number":null}');
  exception when others then
    null;
  end;
  if (select opened_at from lootboxes where id = box) is not null then
    raise exception 'FAIL failed open still spent the lootbox';
  end if;

  select count(*) into opened from public.open_lootboxes('00000000-0000-0000-0000-00000000000b',
    jsonb_build_array(instance, instance, instance, instance, instance, instance, instance, instance));
  if opened <> (select count(*) from lootboxes where user_id = '00000000-0000-0000-0000-00000000000b' and opened_at is not null) - 1 then
    raise exception 'FAIL open_lootboxes count mismatch';
  end if;
  if exists (select 1 from lootboxes where user_id = '00000000-0000-0000-0000-00000000000b' and opened_at is null) then
    raise exception 'FAIL open_lootboxes left boxes unopened';
  end if;
end $$;

select 'all database tests passed' as result;

rollback;

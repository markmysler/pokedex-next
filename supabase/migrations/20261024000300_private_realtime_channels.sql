-- Private Realtime channels.
--
-- Every channel (user:<id>, friendship:<id>, room:<code>) used to be a
-- public topic: anyone with the publishable key could subscribe to
-- user:<someone else's id> and read their incoming DMs and notifications
-- live (user ids are visible on the leaderboard), or send fake events into
-- a room they weren't in. The clients and lib/supabase/broadcast.ts now
-- open every channel with { private: true }, and these policies on
-- realtime.messages decide who may join a topic:
--   user:<id>        only that user
--   friendship:<id>  only the two people in that accepted friendship
--   room:<code>      only the room's two players
-- Receiving needs SELECT; sending needs INSERT, which is allowed only for
-- the one client-to-client event (room chat). Everything else is sent by
-- Route Handlers with service_role, which bypasses these policies.
--
-- Also turn off "Allow public access" under Realtime settings in the
-- Supabase dashboard for production, so no public channel can be opened
-- at all. That's a project setting, not something a migration can change.

-- Runs as its owner so the policy can check rooms and friendships even
-- though the browser roles have no table privileges.
create or replace function public.can_use_realtime_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when p_topic = 'user:' || auth.uid()::text then true
    when p_topic like 'room:%' then exists (
      select 1 from battle_rooms
      where code = substr(p_topic, 6)
        and auth.uid() in (player1_id, player2_id)
    )
    when p_topic like 'friendship:%' then exists (
      select 1 from friendships
      where id::text = substr(p_topic, 12)
        and status = 'accepted'
        and auth.uid() in (requester_id, addressee_id)
    )
    else false
  end;
$$;

revoke execute on function public.can_use_realtime_topic(text) from public, anon, authenticated;
grant execute on function public.can_use_realtime_topic(text) to authenticated, service_role;

drop policy if exists "Members receive their own topics" on realtime.messages;
create policy "Members receive their own topics"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.can_use_realtime_topic(realtime.topic())
  );

drop policy if exists "Room players send chat" on realtime.messages;
create policy "Room players send chat"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.event = 'chat-message'
    and realtime.topic() like 'room:%'
    and public.can_use_realtime_topic(realtime.topic())
  );

-- Room chat gets its own private topic: room-chat:<code>.
--
-- The "Room players send chat" policy from 20261024000300 never let a
-- message through. Realtime doesn't run the INSERT policy per message: it
-- checks once, when a client joins, by inserting a probe row that carries
-- only topic and extension (event is NULL), and remembers whether that
-- worked. `event = 'chat-message'` is never true for the probe, so every
-- client joined room:<code> read-only and Realtime silently dropped the
-- chat messages it sent.
--
-- Dropping the event check on room:<code> would let a player broadcast
-- fake round-result / battle-start events to their opponent, so the room
-- topic stays receive-only (only Route Handlers, with service_role, send on
-- it) and chat moves to room-chat:<code>, which the room's two players may
-- both receive and send on. Nothing on that topic is trusted.

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
    when p_topic like 'room-chat:%' then exists (
      select 1 from battle_rooms
      where code = substr(p_topic, 11)
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

drop policy if exists "Room players send chat" on realtime.messages;
create policy "Room players send chat"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'room-chat:%'
    and public.can_use_realtime_topic(realtime.topic())
  );

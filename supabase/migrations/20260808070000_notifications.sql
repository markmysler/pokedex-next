-- Step 17 of the upgrade path (see pokedex-next/upgrades/17-persistent-notifications.md):
-- a persisted, browsable record of the same six event kinds
-- FriendNotifications.tsx already pushes as a live toast (friend-request,
-- friend-request-accepted, battle-invite, friend-message, trade-offer,
-- trade-resolved). Toasts stay exactly as they are for someone actively in
-- the app; this table is what makes the same events recoverable after a
-- refresh, most importantly for battle invites, which today have no other
-- persisted record anywhere (a battle_rooms row doesn't say who was invited).
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null, -- same shape already passed to broadcastToUser()
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_id_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users can read their own notifications"
  on notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert policy for authenticated -- notifications are only ever
-- created server-side (secret key) alongside the existing
-- broadcastToUser() call that produces the live toast, same trust
-- boundary as every other table here.
grant all on table public.notifications to service_role;
grant select, update on table public.notifications to authenticated;

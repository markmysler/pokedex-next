-- Step 12 of the upgrade path (see pokedex-next/upgrades/12-friend-chat-trading.md):
-- persistent friend DMs (unlike ephemeral battle chat) and Pokemon trading
-- between accepted friends.

create table friend_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index friend_messages_friendship_id_idx on friend_messages(friendship_id, created_at);

alter table friend_messages enable row level security;

-- Readable/insertable only by the two accounts on that friendship's row --
-- same check shape as friendships' own policies, just one join away.
create policy "Friends can read their DM history"
  on friend_messages for select
  to authenticated
  using (
    exists (
      select 1 from friendships f
      where f.id = friend_messages.friendship_id
        and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    )
  );

create policy "Friends can send DMs as themselves"
  on friend_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from friendships f
      where f.id = friend_messages.friendship_id
        and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    )
  );

grant all on table public.friend_messages to service_role;
grant select, insert on table public.friend_messages to authenticated;

create table trade_offers (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references friendships(id) on delete cascade,
  offered_by uuid not null references auth.users(id) on delete cascade,
  offered_instance_ids jsonb not null,   -- pokemon_instances ids owned by offered_by
  requested_instance_ids jsonb not null, -- pokemon_instances ids owned by the other friend
  status text not null default 'pending', -- 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index trade_offers_friendship_id_idx on trade_offers(friendship_id, created_at);

alter table trade_offers enable row level security;

create policy "Friends can read trades on their friendship"
  on trade_offers for select
  to authenticated
  using (
    exists (
      select 1 from friendships f
      where f.id = trade_offers.friendship_id
        and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    )
  );

create policy "Friends can propose trades as themselves"
  on trade_offers for insert
  to authenticated
  with check (
    offered_by = auth.uid()
    and exists (
      select 1 from friendships f
      where f.id = trade_offers.friendship_id
        and f.status = 'accepted'
        and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
    )
  );

grant all on table public.trade_offers to service_role;
grant select, insert on table public.trade_offers to authenticated;
-- No update policy for authenticated -- accepting/declining go through
-- Route Handlers with the secret key (decline/cancel is a plain UPDATE
-- there; accept goes through accept_trade() below), same defense-in-depth
-- posture as every other table here.

-- Accepting a trade is a real, irreversible ownership transfer -- worth
-- being stricter here than most of this app's other atomic updates. A
-- plain sequence of Route-Handler-side UPDATEs isn't strong enough: a
-- failure partway through would leave Pokemon transferred on one side but
-- not the other. Re-validates *at accept time* that every offered/requested
-- id is still owned by the expected account and the trade is still
-- pending -- an inventory can change between offer and accept (e.g. an
-- offered Pokemon gets discarded, or traded away in a different pending
-- trade), and a stale offer must be rejected outright, not partially
-- applied. `for update` on the trade row serializes concurrent accept
-- attempts on the same offer.
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

  select count(*) into v_offered_count from pokemon_instances where id = any(v_offered_ids) and user_id = v_offering_id;
  if v_offered_count is distinct from array_length(v_offered_ids, 1) then
    raise exception 'One or more offered Pokemon are no longer available';
  end if;

  select count(*) into v_requested_count from pokemon_instances where id = any(v_requested_ids) and user_id = v_requesting_id;
  if v_requested_count is distinct from array_length(v_requested_ids, 1) then
    raise exception 'One or more requested Pokemon are no longer available';
  end if;

  update pokemon_instances set user_id = v_requesting_id where id = any(v_offered_ids);
  update pokemon_instances set user_id = v_offering_id where id = any(v_requested_ids);

  update trade_offers set status = 'accepted', resolved_at = now() where id = p_trade_id;
end;
$$;

grant execute on function accept_trade(uuid, uuid) to service_role;

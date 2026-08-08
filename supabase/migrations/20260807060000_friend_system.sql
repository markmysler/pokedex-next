-- Step 5 of the upgrade path v2 (see pokedex-next/upgrades/05-friend-system.md):
-- friend codes -- a short, unique, shareable code per account, the same
-- room-code mental model already used for battle rooms -- plus a
-- friendships table for requests/acceptances. No username search/public
-- directory (profiles.display_name has no uniqueness constraint and stays
-- that way).

alter table profiles add column friend_code text;

-- Backfill existing accounts before enforcing uniqueness -- same alphabet
-- as lib/roomCode.ts's generateRoomCode() (no 0/O or 1/I), retrying on
-- collision.
do $$
declare
  r record;
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  for r in select user_id from profiles where friend_code is null loop
    loop
      new_code := '';
      for i in 1..6 loop
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      end loop;
      begin
        update profiles set friend_code = new_code where user_id = r.user_id;
        exit;
      exception when unique_violation then
        -- collision against a code assigned earlier in this same backfill
        -- loop (no unique constraint exists yet to actually raise this, but
        -- the retry loop is here defensively in case one is added later) --
        -- fall through and roll a new code.
      end;
    end loop;
  end loop;
end $$;

alter table profiles alter column friend_code set not null;
alter table profiles add constraint profiles_friend_code_key unique (friend_code);

-- Extends handle_new_user (originally 01-auth.md, extended again in
-- 02-collection-system.md for starters) so every new signup also gets a
-- friend code, atomically with the profile/starter rows in the same
-- transaction -- retry-on-collision, mirroring generateRoomCode()'s callers
-- (app/api/rooms/route.ts) in PL/pgSQL since this runs inside the trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_friend_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt int := 0;
begin
  loop
    new_friend_code := '';
    for i in 1..6 loop
      new_friend_code := new_friend_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    attempt := attempt + 1;
    exit when not exists (select 1 from profiles where friend_code = new_friend_code) or attempt >= 10;
  end loop;

  insert into public.profiles (user_id, display_name, friend_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    new_friend_code
  );

  insert into public.pokemon_instances
    (user_id, pokemon_number, hp, atk, def, spatk, spdef, spd, total, moves, is_starter)
  values
    (new.id, '004', 39, 52, 43, 60, 50, 65, 309,
     '[
        {"name":"Scratch","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Ember","type":"Fire","power":40,"category":"Special","mana_cost":10},
        {"name":"Flamethrower","type":"Fire","power":90,"category":"Special","mana_cost":30},
        {"name":"Fire Blast","type":"Fire","power":110,"category":"Special","mana_cost":30}
      ]'::jsonb,
     true),
    (new.id, '007', 44, 48, 65, 50, 64, 43, 314,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Water Gun","type":"Water","power":40,"category":"Special","mana_cost":10},
        {"name":"Bubble Beam","type":"Water","power":65,"category":"Special","mana_cost":20},
        {"name":"Hydro Pump","type":"Water","power":110,"category":"Special","mana_cost":30}
      ]'::jsonb,
     true),
    (new.id, '001', 45, 49, 49, 65, 65, 45, 318,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Vine Whip","type":"Grass","power":45,"category":"Physical","mana_cost":10},
        {"name":"Razor Leaf","type":"Grass","power":55,"category":"Physical","mana_cost":10},
        {"name":"Solar Beam","type":"Grass","power":120,"category":"Special","mana_cost":45}
      ]'::jsonb,
     true);

  return new;
end;
$$;

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'accepted'
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index friendships_requester_id_idx on friendships(requester_id);
create index friendships_addressee_id_idx on friendships(addressee_id);

alter table friendships enable row level security;

-- Route Handlers (app/api/friends/**) use the secret key server-side for
-- the real logic, same defense-in-depth pattern as every other table here.
create policy "Users can read their own friendships"
  on friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests as themselves"
  on friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Addressees can respond to requests"
  on friendships for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

create policy "Either party can delete a friendship"
  on friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant all on table public.friendships to service_role;
grant select, insert, update, delete on table public.friendships to authenticated;

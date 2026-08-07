-- Step 1 of the upgrade path (see pokedex-next/upgrades/01-auth.md): replaces
-- anonymous per-browser identity (anon_id cookie) with Supabase Auth accounts.
-- Existing user_pokedex/battle_rooms data is dropped rather than migrated --
-- it's keyed by random anon cookie UUIDs with no relationship to a real
-- account (see upgrades/main.md's "key decisions" section).

drop function if exists submit_move(text, int, jsonb);
drop function if exists finalize_round(text, jsonb);
drop table if exists battle_rooms;
drop table if exists user_pokedex;

-- One row per account. This is the ONLY place a user's identity is ever
-- exposed to another user (leaderboard, chat, opponent-facing UI) --
-- email/auth.users must never be queried from anything user-facing.
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Populates `profiles` from the display_name passed as signup metadata
-- (supabase.auth.signUp({ options: { data: { display_name } } })) so a
-- profile always exists the moment an account exists, instead of relying on
-- a separate client-side insert call that could fail or be skipped.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Per-account Pokedex state -- same shape as before, keyed by user_id
-- instead of anon_id.
create table user_pokedex (
  user_id uuid not null references auth.users(id) on delete cascade,
  pokemon_number text not null,
  acquired boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, pokemon_number)
);

alter table user_pokedex enable row level security;

-- Route Handlers (app/api/user-data/**) use the secret key server-side for
-- all access today, same pattern as before this migration. These policies
-- are defense-in-depth for any future direct-from-browser access and are
-- not currently exercised by the app.
create policy "Users manage their own pokedex rows"
  on user_pokedex for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Online battle rooms -- same shape as before, keyed by user_id instead of
-- anon_id. RLS stays zero-policy / service-role-only: race-safe round
-- resolution goes through the submit_move/finalize_round RPCs below, called
-- only from Route Handlers with the secret key (see lib/supabase/broadcast.ts
-- and app/api/rooms/**/route.ts).
create table battle_rooms (
  code text primary key,
  player1_id uuid not null references auth.users(id) on delete cascade,
  player1_fighter text not null,
  player2_id uuid references auth.users(id) on delete cascade,
  player2_fighter text,
  status text not null default 'waiting',
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table battle_rooms enable row level security;

-- Atomically records one player's move for the round without a read-modify-write
-- race: a single UPDATE...RETURNING is serialized per-row by Postgres, so two
-- players submitting at nearly the same time can't clobber each other's entry.
create or replace function submit_move(p_code text, p_slot int, p_move jsonb)
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
  returning state;
$$;

create or replace function finalize_round(p_code text, p_new_state jsonb)
returns jsonb
language sql
as $$
  update battle_rooms
  set state = p_new_state
  where code = p_code
  returning state;
$$;

-- Grants: tables/functions created via migration don't inherit Supabase's
-- dashboard-auto-grants (see the original 20260807000100_grants.sql fix
-- for the anon_id-era schema -- same issue applies here).
grant usage on schema public to service_role, authenticated;

grant all on table public.profiles to service_role;
grant select, update on table public.profiles to authenticated;

grant all on table public.user_pokedex to service_role;
grant select, insert, update on table public.user_pokedex to authenticated;

grant all on table public.battle_rooms to service_role;

grant execute on function public.submit_move(text, int, jsonb) to service_role;
grant execute on function public.finalize_round(text, jsonb) to service_role;
grant execute on function public.handle_new_user() to service_role;

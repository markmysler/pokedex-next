-- Step 3 of the upgrade path (see pokedex-next/upgrades/03-bot-battle-rework.md):
-- battles now draw from owned pokemon_instances instead of raw species
-- numbers, and every completed battle gets logged.

-- battle_rooms.player{1,2}_fighter held a raw species number before this
-- migration; it now holds a pokemon_instances.id (the room already stores
-- built FighterState snapshots in `state` once both players are in, so no
-- new column is needed — just a clearer name for what the id refers to).
alter table battle_rooms rename column player1_fighter to player1_pokemon_instance_id;
alter table battle_rooms rename column player2_fighter to player2_pokemon_instance_id;

-- Deliberately minimal (see upgrades/02-collection-system.md's "Dashboard
-- needs real data" decision): just enough for the Dashboard's
-- recent-matches/win-loss widgets. Step 7 (Match History) extends this into
-- the full shape rather than starting over.
create table match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opponent text not null, -- 'bot', or the other player's user_id as text (online)
  mode text not null check (mode in ('bot', 'online')),
  won boolean not null,
  played_at timestamptz not null default now()
);

create index match_results_user_id_idx on match_results(user_id);

alter table match_results enable row level security;

-- Rows are a historical log written by Route Handlers with the secret key —
-- no update/delete policy for authenticated, only read-your-own and
-- insert-your-own as defense-in-depth.
create policy "Users read their own match results"
  on match_results for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert their own match results"
  on match_results for insert
  to authenticated
  with check (auth.uid() = user_id);

grant all on table public.match_results to service_role;
grant select, insert on table public.match_results to authenticated;

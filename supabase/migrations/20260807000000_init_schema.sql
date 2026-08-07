-- Anonymous per-browser Pokedex state: replaces pokedex-web/server/userData.js's
-- single JSON file with one row per (browser, pokemon).
create table if not exists user_pokedex (
  anon_id uuid not null,
  pokemon_number text not null,
  acquired boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (anon_id, pokemon_number)
);

-- Online battle rooms: replaces pokedex-web/server/onlineRooms.js's in-memory Map.
-- `state` mirrors the RoomState shape in types/pokemon.ts:
--   { fighter1: {...}, fighter2: {...}, pending: {"1": Move|null, "2": Move|null},
--     turnCount, over, winner }
create table if not exists battle_rooms (
  code text primary key,
  player1_id uuid not null,
  player1_fighter text not null,
  player2_id uuid,
  player2_fighter text,
  status text not null default 'waiting',
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS on, no policies: only the service-role key (used server-side in Route
-- Handlers, which bypasses RLS entirely) can touch these tables. The
-- publishable key used by the browser is only ever used for Realtime
-- subscriptions, never direct table access.
alter table user_pokedex enable row level security;
alter table battle_rooms enable row level security;

-- Atomically records one player's move for the round without a read-modify-write
-- race: a single UPDATE...RETURNING is serialized per-row by Postgres, so two
-- players submitting at nearly the same time can't clobber each other's entry.
-- The Route Handler inspects the returned state; if both slots are now filled,
-- it resolves the round in TypeScript (lib/battleEngine.ts) and calls
-- finalize_round() below to persist the result — battle math stays in one
-- place instead of being duplicated in SQL.
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

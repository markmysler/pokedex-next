-- Step 5 of the upgrade path (see pokedex-next/upgrades/05-3v3-battles.md):
-- online battles move from one Pokemon per side to a 3-member team with
-- switching, and room lifecycle grows a "picking" phase so picks stay
-- hidden from the opponent until both players have locked in.

-- The single-pick columns from step 3 no longer apply -- team composition
-- is decided during the new "picking" phase (see app/api/rooms/[code]/lock-in),
-- after both players are seated. battle_rooms is transient game-session
-- state, not user-owned data, so dropping these loses nothing worth
-- migrating; any in-flight room from before this deploy just becomes dead.
alter table battle_rooms
  drop column player1_pokemon_instance_id,
  drop column player2_pokemon_instance_id,
  add column player1_team_ids jsonb,
  add column player2_team_ids jsonb;

-- Room lifecycle is now waiting_for_players -> picking -> battling -> over
-- (previously waiting -> battling -> over). No CHECK constraint here,
-- matching the table's existing style (status has always been a plain
-- app-managed text column) -- and adding one now would require reconciling
-- any leftover 'waiting' rows from before this migration.
alter table battle_rooms alter column status set default 'waiting_for_players';

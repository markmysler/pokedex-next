-- Step 7 of the upgrade path (see pokedex-next/upgrades/07-match-history-leaderboard.md):
-- extends match_results (step 3) with enough detail for a real per-match
-- history view instead of a bare win/loss row. Existing rows stay valid --
-- both new columns are nullable, only ever populated for online matches
-- going forward.
alter table match_results
  add column room_code text,
  add column team_snapshot jsonb;

-- No RLS changes: the existing "read/insert your own rows" policies already
-- cover the new columns. The leaderboard aggregates match_results across
-- every user, which RLS deliberately does NOT allow for authenticated
-- clients -- that read only ever happens server-side with the secret key
-- (see lib/leaderboard.ts), same trust boundary as every other cross-user
-- query in this app.

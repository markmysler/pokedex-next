# Step 5: Match history + public leaderboard

## Why here

Needs a durable `user_id` (step 1) to attribute results to accounts instead of ephemeral rooms, and needs the team/battle shape from step 3 to be settled so the history schema doesn't need a second migration once 3v3 lands. Also benefits from step 4 existing, since a rematch is a second recorded match on the same room code, not an edit to the first one.

## What changes

### Database
- New `battle_history` table: `id` (PK), `room_code`, `player1_id`, `player2_id`, `winner_id` (nullable, in case a draw/abandon path exists), `played_at`. Optionally store a snapshot of each side's final team (3 Pokemon numbers) for a "past matches" detail view — cheap to add now, harder to backfill later.
- RLS: `battle_history` rows are readable by either participant (`auth.uid() in (player1_id, player2_id)`); leaderboard aggregation reads happen through a Route Handler using the secret key, not direct client queries, since it needs to join across all users' rows.

### Server
- Insert a `battle_history` row at the same point `battle_rooms.status` flips to `over` in `move/route.ts` (and again after each completed rematch, per step 4 — one row per completed battle, not per room).
- New `GET /api/history` — the current user's own matches, most recent first.
- New `GET /api/leaderboard` — aggregate win counts per user, joined to `profiles.display_name` (never expose email). A `GROUP BY winner_id` query is enough at this scale; no need for a materialized view.

### Client
- New `app/history/page.tsx` — the logged-in user's past matches (opponent, result, date; team snapshot if stored).
- New `app/leaderboard/page.tsx` — ranked list of display names + win counts, public to any logged-in user (not necessarily just the two participants).

## End state

- [ ] Completing an online battle creates exactly one `battle_history` row with the correct winner.
- [ ] A rematch (step 4) produces a second, independent `battle_history` row rather than overwriting the first.
- [ ] `/history` shows only the logged-in user's own matches; a different account's matches never appear.
- [ ] `/leaderboard` shows aggregate wins across all accounts and updates after a new match completes.
- [ ] No email addresses or other private account info are exposed via the leaderboard — only `display_name`.
- [ ] `npm run build` / `npm run lint` clean.

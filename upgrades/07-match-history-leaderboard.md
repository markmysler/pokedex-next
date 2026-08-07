# Step 7: Match history + public leaderboard

## Why here

Step 3 already introduced a minimal `match_results` table (just enough to power the Dashboard's recent-matches/win-loss widgets, pulled forward from this step so the UI phase didn't have to ship with fake data). This step is that table's real payoff: extend it into the full shape, add a per-match detail view, and add the public leaderboard. It doesn't start history tracking from scratch — it upgrades what's already logging real data since step 3.

## What changes

### Database
- Extend `match_results` (step 3) rather than replacing it: add `room_code` (nullable — only set for online matches), and a snapshot of each side's final team (owned instance ids or a lightweight `{number, name}[]` copy — cheap to add now, harder to backfill later). Existing rows from step 3 onward stay valid; only new columns are nullable/backfillable.
- RLS: rows readable by the user they belong to (`auth.uid() = user_id`); leaderboard aggregation reads happen through a Route Handler using the secret key, not direct client queries, since it needs to join across all users' rows.

### Server
- `move/route.ts` (already inserting `match_results` rows since step 3) now also fills `room_code` and the team snapshot for online matches. Bot matches (`/api/battles/bot-result`, step 3) stay without a `room_code`.
- New `GET /api/history` — the current user's own matches, most recent first, now with real detail instead of step 3's bare win/loss row.
- New `GET /api/leaderboard` — aggregate win counts per user, joined to `profiles.display_name` (never expose email). A `GROUP BY user_id` query is enough at this scale; no need for a materialized view.

### Client
- `app/(app)/history/page.tsx` (step 4's placeholder-grade list) upgrades to show per-match detail (opponent, team snapshot, date) instead of just win/loss.
- New `app/(app)/leaderboard/page.tsx` — ranked list of display names + win counts, visible to any logged-in user (not just the two participants in a given match). Add it to `SideNav.tsx` (step 4).

## End state

- [ ] Completing an online battle records `room_code` and both teams' snapshots on its `match_results` row(s); bot battles keep working as they did since step 3 (no room code).
- [ ] A rematch (step 6) produces a second, independent `match_results` row per player rather than overwriting the first.
- [ ] `/history` shows real per-match detail for the logged-in user only; a different account's matches never appear.
- [ ] `/leaderboard` shows aggregate wins across all accounts and updates after a new match completes.
- [ ] No email addresses or other private account info are exposed via the leaderboard — only `display_name`.
- [ ] `npm run build` / `npm run lint` clean.

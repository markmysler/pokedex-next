# Step 7: Leaderboard counts online wins only

## Why here

Independent, small, no dependencies. Today `lib/leaderboard.ts` counts
every win in `match_results` regardless of `mode` — a bot win (a 1v1-turned-
3v3 fight against a randomly-rolled, non-competitive opponent) counts
exactly the same as beating another real player online. That lets rank be
farmed by grinding bots endlessly, which defeats the point of a
leaderboard: standing relative to other *players*. Bot performance isn't
lost by this change — the Dashboard already shows bot wins/losses and
online wins/losses as separate counts (`stats.botWins`, `stats.onlineWins`,
etc. in `app/(app)/dashboard/page.tsx`), so nothing needs to be added there
to satisfy "at least count bot wins separately" — it already is.

## What changes

- `lib/leaderboard.ts`'s `getLeaderboard()`: the wins query gains
  `.eq("mode", "online")` alongside its existing `.eq("won", true)` —
  the only line that changes.
- `app/(app)/leaderboard/page.tsx`: the `leaderboard-wins` label changes
  from `"{n} win(s)"` to `"{n} online win(s)"`, so the page is explicit
  about what's being ranked (was ambiguous before this change too, but
  became actively misleading once bot wins stop counting).
- No migration — `match_results.mode` already exists and is already
  populated correctly for every row (see the original plan's step 3/step 7).
- No change to `GET /api/leaderboard` beyond what `getLeaderboard()` already
  does internally.

## End state

- [ ] An account with many bot wins and zero online wins shows 0 wins on
      the leaderboard (verify directly, not just by reading the code).
- [ ] An account with online wins ranks correctly among others, unaffected
      by how many bot battles anyone has played.
- [ ] The Dashboard's separate bot/online win-loss breakdown is unchanged.
- [ ] `npm run build` / `npm run lint` clean.

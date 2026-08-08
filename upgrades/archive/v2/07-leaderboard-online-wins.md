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

- [x] An account with many bot wins and zero online wins shows 0 wins on
      the leaderboard (verify directly, not just by reading the code).
- [x] An account with online wins ranks correctly among others, unaffected
      by how many bot battles anyone has played.
- [x] The Dashboard's separate bot/online win-loss breakdown is unchanged.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- No migration needed, so this could be validated directly against the live
  Supabase project with no push-and-wait step. Ran a temporary script
  (deleted after running) against a local dev server: created 2 disposable
  accounts, seeded `match_results` rows directly (mirroring exactly what the
  real bot-result/room routes insert) — one account with 3 bot wins and 0
  online activity, the other with 2 online wins, 1 online loss, and 1 bot
  win — then fetched `/leaderboard` as each via a real signed-in session.
  12/12 checks passed: the bot-only farmer shows "0 online wins" (not 3, and
  not omitted from the list either — still ranked, just at zero); the mixed
  account shows exactly "2 online wins" (the bot win did not leak into the
  count); the page label reads "N online win(s)" for both. A separate check
  confirmed `/dashboard` still shows the bot and online win counts split out
  correctly for an account with both, unaffected by this change.
- One false failure during the first run, not a real bug: a plain substring
  check against the rendered HTML missed because React's SSR output inserts
  `<!-- -->` comment markers between adjacent JSX text expressions (e.g.
  `{wins}<!-- --> online win<!-- -->s`) to preserve hydration boundaries —
  stripped those before matching and reran clean.

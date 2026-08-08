# Step 18: Show the actual opponent display name everywhere match history is shown

## Why here

Independent of steps 16 and 17. Small display-only fix, done last simply
because it was reported last.

## What changes

### The bug
`lib/history.ts`'s `getMatchHistoryForUser()` already resolves an online
match's opponent id to their real `display_name` (a batch `profiles`
lookup keyed by every distinct `opponent` id in the account's match
history) and has since step 7 of the v2 plan — the `/history` page,
which calls this helper directly, already shows the real name correctly.

The Dashboard's separate "Recent Matches" card
(`app/(app)/dashboard/page.tsx`) doesn't use this helper — it runs its
own inline `match_results` query and renders `{m.mode === "bot" ? "a
bot" : "another player"}`, a hardcoded string for *every* online match
regardless of who it actually was. This is a duplication bug (the same
resolution logic written twice, once correctly and once not), not a
missing feature.

### The fix
`DashboardPage` drops its separate raw `match_results` query for the
"Recent Matches" card and calls `getMatchHistoryForUser()` instead
(already fetched once for `getDashboardStats()`'s own needs as of step
13 — reuse that same result, sliced to the 5 most recent, rather than
querying twice). Renders `m.opponentLabel` (already the resolved display
name for online matches, `"a Bot"` for bot matches, `"a departed player"`
for the rare case where the opponent id doesn't resolve to a live
profile) instead of the hardcoded string.

## End state

- [ ] The Dashboard's "Recent Matches" card shows the real display name
      for online opponents, not "another player" — verified against an
      actual online match against a named test account, not just reading
      the code.
- [ ] Bot matches still show "a Bot" (or equivalent), unaffected.
- [ ] `/history` is unaffected (it already worked) — confirm it still
      does after this refactor, not just that Dashboard changed.
- [ ] No duplicate `match_results` query — Dashboard reuses the same
      resolved data `getDashboardStats()` already fetches rather than
      querying twice.
- [ ] `npm run build` / `npm run lint` clean.

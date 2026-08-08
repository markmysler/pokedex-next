# Step 13: Richer Dashboard statistics

## Why here

Independent of steps 6-12. Ordered before step 14 (trade-up) because that
step needs the "Pokémon released" counter this step introduces — trade-up
just increments the same counter discard already will, rather than
inventing a second one later.

## What changes

### New data needed
Most of the requested stats are already derivable from existing tables —
only two things are genuinely missing:

1. **A durable "Pokémon released" count.** Discarding permanently `DELETE`s
   the `pokemon_instances` row — there's no history to count after the
   fact. Rather than switching to soft-deletes (a bigger, riskier change to
   every query that reads `pokemon_instances`), add one counter:
   ```sql
   alter table profiles add column pokemon_released_count int not null default 0;
   ```
   `DELETE /api/inventory/pokemon/[id]` (discard) additionally runs
   `UPDATE profiles SET pokemon_released_count = pokemon_released_count + 1
   WHERE user_id = $1` — a single atomic increment, no read-modify-write
   race. Named "released," not "discarded," on purpose: step 14's trade-up
   burns 5 at a time and increments this same counter, so the stat stays
   meaningful regardless of which mechanism was used.

2. **Bot battles' team composition.** `match_results.team_snapshot` is
   already populated for online matches (`recordBattleEnd()` in
   `app/api/rooms/[code]/move/route.ts`) but bot matches never got this —
   `POST /api/battles/bot-result` today only ever receives `{ won }`, not
   which team was used (this was flagged as an optional nicety when step 1
   shipped and left undone). "Most used Pokémon in battle" needs both
   modes counted, so this step finally does it:
   - `BattleArena.tsx`'s `reportBotResult()` sends `{ won, team:
     myTeam.map(p => ({ number: p.number, name: p.name })) }` instead of
     just `{ won }`.
   - `bot-result/route.ts` stores that array into `match_results
     .team_snapshot`, same shape `teamSnapshot()` already produces for
     online matches.
   - No backfill — matches recorded before this ships simply have no
     `team_snapshot` and are excluded from the "most used" aggregate
     going forward, same "no retroactive migration" precedent as step 3's
     shiny rollout.

### `lib/dashboardStats.ts` (new)
One shared helper, `getDashboardStats(supabase, userId)`, following the
`lib/leaderboard.ts`/`lib/history.ts` pattern — keeps
`app/(app)/dashboard/page.tsx` thin instead of growing a wall of ad-hoc
queries inline. Returns:
- `botWinPct` / `onlineWinPct` — `wins / (wins + losses) * 100` per mode,
  `null` (rendered as "—") when a mode has zero matches played, not `0`
  or `NaN`.
- `lootboxesOpened` — `count(*) from lootboxes where user_id = $1 and
  opened_at is not null`.
- `pokemonReleased` — straight read of `profiles.pokemon_released_count`.
- `mostUsedPokemon` — flatten every `match_results.team_snapshot` (both
  modes) the account has, count occurrences by `number`, return the top
  one (name + count), or `null` if no match has a snapshot yet.
- `mostOwnedPokemon` — group current `pokemon_instances` by
  `pokemon_number`, return the species owned in the greatest quantity
  (name + count), or `null` if the account owns nothing.
- `pokedexOwnedPct` — distinct `pokemon_number` values currently owned,
  divided by `pokedexOrder.length` (the static species count from
  `lib/pokedex.ts`) — a snapshot of current ownership, not historical (a
  species you owned once and fully released/traded away no longer counts,
  which matches what "% of Pokédex owned" should mean).

### Client
`app/(app)/dashboard/page.tsx`'s existing "Battle Stats" card gains the two
percentages next to the existing win/loss counts. A new "Collection Stats"
card holds lootboxes opened, Pokémon released, most-used, most-owned, and
% of Pokédex owned — same `.card`/`.dashboard-stats-grid` markup pattern
already used, no new component library.

## End state

- [ ] Battle Stats shows bot and online win percentages, correctly
      handling zero-matches-played as "—" rather than a division error.
- [ ] Collection Stats shows lootboxes opened, Pokémon released, most-used
      Pokémon (counting both bot and online matches), most-owned Pokémon,
      and % of Pokédex owned.
- [ ] Discarding a Pokémon increments the released counter by exactly 1;
      verify directly in Supabase, not just via the dashboard number.
- [ ] A bot battle's team now appears in `match_results.team_snapshot`,
      matching online matches' existing shape.
- [ ] `npm run build` / `npm run lint` clean.

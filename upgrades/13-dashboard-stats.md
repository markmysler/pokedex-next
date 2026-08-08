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

- [x] Battle Stats shows bot and online win percentages, correctly
      handling zero-matches-played as "—" rather than a division error.
- [x] Collection Stats shows lootboxes opened, Pokémon released, most-used
      Pokémon (counting both bot and online matches), most-owned Pokémon,
      and % of Pokédex owned.
- [x] Discarding a Pokémon increments the released counter by exactly 1;
      verify directly in Supabase, not just via the dashboard number.
- [x] A bot battle's team now appears in `match_results.team_snapshot`,
      matching online matches' existing shape.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- This step needed a real schema change (`profiles.pokemon_released_count`
  + `increment_released_count()`) — pushed to `origin/main` (confirmed with
  the user first) and let the Supabase GitHub integration apply it, same as
  steps 5, 8, and 12. Confirmed applied by querying the new column directly
  before running any other checks; applied quickly this time (a single
  check, no repeated polling needed).
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the now-migrated live Supabase project, using
  2 disposable test accounts — 25 checks, all passing:
  - **Win rates**: account A (2 bot wins, 1 bot loss reported via
    `POST /api/battles/bot-result`) renders `67%` bot win rate; its 0 online
    matches render as `—`, not `0%`/`NaN%`. Account B (a genuinely
    zero-matches-played account) renders `—` for both bot and online win
    rate.
  - **Team snapshots**: all 3 of account A's bot-result calls produced a
    `match_results.team_snapshot` row in the exact same `{number, name}[]`
    shape online matches already used — verified directly in Supabase, not
    just via a 200 response. The Pokémon appearing in 2 of the 3 snapshots
    correctly became the rendered "most used" entry.
  - **Released counter**: seeded 3 owned Pokémon, discarded 2 one at a time
    via `DELETE /api/inventory/pokemon/[id]`, and confirmed directly in
    Supabase that `profiles.pokemon_released_count` increased by exactly 1
    per discard (not 0, not 2) — both after the first discard and again
    after the second, ruling out a double-increment or a reset.
  - **Most-owned / % of Pokédex owned**: verified against Supabase ground
    truth, not a hardcoded guess — cross-checked the rendered "most owned"
    name/count and Pokédex-ownership percentage against the actual
    `pokemon_instances` rows for the account.
  - **Discovered while validating, not a bug**: every new signup's
    `handle_new_user()` trigger (from step 2) grants a fixed 3-Pokémon
    starter team (Bulbasaur/Charmander/Squirtle) atomically — so a "fresh"
    test account is never actually empty. The zero-matches-played account
    (B) still owns those 3 starters and correctly shows a non-"—" most-owned
    entry and a non-zero % of Pokédex owned; only the win-rate fields (which
    depend on *matches*, not *ownership*) are "—" for it. The other account
    (A) had its auto-granted starter deleted directly in Supabase before
    seeding controlled test data, so its most-owned/most-used assertions
    could be exact rather than tied against an unpredictable starter roll.
  - **React SSR hydration comment, not a bug**: the % of Pokédex owned is
    written in JSX as two sibling children (`{pct.toFixed(1)}%`), so
    Next.js's server-rendered HTML inserts an invisible `<!-- -->` marker
    between the number and the `%` sign to preserve the hydration boundary.
    Visually invisible, confirmed harmless — the validation script's string
    match was adjusted to tolerate it rather than treating it as a defect.
- Not independently verified via a real browser (no browser automation tool
  available in this environment): visual layout/spacing of the two stats
  grids on the Dashboard page. The underlying data was confirmed live above
  (real match/discard/lootbox state, real rendered numbers extracted from
  the actual server-rendered HTML) — same category of gap flagged in every
  prior step's validation notes.

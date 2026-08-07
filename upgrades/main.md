# Upgrade Path

Order and rationale for implementing the features listed in `todo.txt` (and, from step 2 on, the collection/lootbox rework that superseded the original "UI upgrades" item). Each step has its own file with what to build and an end state to validate against before moving to the next step.

Auth (identity) and the collection system (what an account actually owns) are foundational — everything else either needs a real `user_id` or a real inventory to draw from, so they come first. Everything after that is ordered by what it builds on top of.

| # | Step | File | Depends on |
|---|------|------|------------|
| 1 | Auth (Supabase email/password, login required app-wide) | [01-auth.md](01-auth.md) | — |
| 2 | Collection system (starters, lootboxes, owned Pokémon instances) | [02-collection-system.md](02-collection-system.md) | 1 |
| 3 | Battle rework (bot randomization/leveling, owned-only teams, lootbox drops) | [03-bot-battle-rework.md](03-bot-battle-rework.md) | 2 |
| 4 | App shell & navigation (dashboard, hamburger nav, inventory/pokedex/history/profile pages) | [04-app-shell-navigation.md](04-app-shell-navigation.md) | 2, 3 |
| 5 | 3v3 battles + manual switching + hidden team lock-in | [05-3v3-battles.md](05-3v3-battles.md) | 1, 2, 3, 4 |
| 6 | Rematch (same room code) | [06-rematch.md](06-rematch.md) | 5 |
| 7 | Match history + public leaderboard | [07-match-history-leaderboard.md](07-match-history-leaderboard.md) | 3 (extends step 3's minimal `match_results` table) |
| 8 | In-match chat | [08-chat.md](08-chat.md) | — (independent, done last as polish) |

Step 1 is implemented and validated. Steps 2–4 replace what was originally a single "UI upgrades" step — the 2026-08-07 request turned out to be a full collection/gacha rework plus a navigation overhaul, not a sidebar redesign, so it's now three steps instead of one.

## Key decisions already made

From the original auth-phase planning:
- **Login is required app-wide** — the anonymous `anon_id` cookie identity is fully replaced by Supabase Auth. Nothing (Pokedex included) works without an account.
- **Rematch reuses the same room code/row** rather than creating a new room.
- Within a round, **switches resolve before attacks**; both players still submit their action simultaneously.
- **Rematch requires both players to confirm** before the room resets (one requests, the other accepts).
- **Chat is ephemeral** (not persisted) and sent client-to-client over the existing Realtime channel without a server round-trip.
- **Match history/leaderboard is public** (global leaderboard across all accounts), not private-per-user.

From the 2026-08-07 collection-system planning:
- **Starting roster**: every account gets exactly 3 starter `pokemon_instances` at signup — Charmander, Squirtle, Bulbasaur — with fixed, non-randomized stats/moveset (guaranteed gear, not a lootbox roll). Flagged as a default assumption, not an explicit requirement — revisit if it doesn't feel right once built.
- **Lootbox drops are winner-only**: 25% chance per bot-battle win, 100% chance per online-battle win. Losers get nothing either way.
- **Lootbox contents are uniform-random** across all 151 species, including species already owned — no rarity tiers, no weighting toward "needed" species. Duplicates are explicitly allowed and intended (multiple instances of the same species, each with independently rolled stats, can coexist in one account's inventory).
- **Stat rolling is independent per stat** (HP/Atk/Def/SpAtk/SpDef/Speed each get their own normal-distribution roll centered on the species' base stat), not one overall "quality" multiplier. Mostly narrow/close-to-base, with rare wide outliers.
- **Moveset rolling** draws from a new global, type-tagged move pool (built by deduplicating the moves already embedded per-species in the existing Pokedex data) — ~85% of a rolled Pokémon's 4 moves match one of its own type(s), ~15% can be any type. Percentages are a starting default, not a hard requirement.
- **Bot leveling has no persisted account-level field.** A bot opponent's species is random, but its stats are re-centered on the average `total` of whichever team the player brings into that specific fight — computed fresh per battle, not tracked over time.
- **The collection/inventory/dashboard rework targets today's 1v1 battle shape.** 3v3 (step 5) stays a separate, later step that layers team-of-3 selection on top once 1v1-with-owned-Pokémon is stable, rather than building team selection twice at once.
- **The Dashboard needs real data from day one.** Step 3 pulls forward a minimal `match_results` table (just enough for recent-matches/win-loss widgets) rather than shipping the Dashboard with placeholders; step 7 later extends that same table into the full match-history/leaderboard feature instead of starting over.
- **"Caught" becomes a derived fact, not a stored toggle.** The Pokedex tab's old manual acquired/not-acquired toggle goes away; a species counts as caught if the account owns ≥1 `pokemon_instances` row for it. Per-species notes (the existing `user_pokedex.notes` field) survive as a separate, independent feature.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file. Every item should be verifiable by hand (`npm run build`, a browser check, a Supabase table query, etc.) — if an item can't be checked, the step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.

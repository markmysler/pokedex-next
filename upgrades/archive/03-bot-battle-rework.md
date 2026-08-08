# Step 3: Battle rework (owned-only teams, randomized/leveled bots, lootbox drops)

## Why here

Depends entirely on step 2: you can't select a battle Pokémon from your inventory, or drop a lootbox into it, before the inventory exists. This step is where "you can only battle with Pokémon you own" and "bots are randomized and leveled, not chosen" actually get enforced — both for local (vs bot) and online battles.

## What changes

### Bot leveling (`lib/collection.ts`)
- New `rollBotOpponent(playerLevel: number): OwnedPokemon` — picks a species uniformly at random from all 151 (the player never chooses it), then rolls its stats the same way `rollInstance` does, but **re-centers** each stat's distribution instead of centering on the species' own base stats: `mean = speciesBaseStat * (playerLevel / speciesBaseTotal)`. `playerLevel` is the average `total` of the player's active battle team — per your decision, there's no persisted level field; it's computed fresh from whichever team you bring into that specific fight.
- This re-centering is what reconciles "randomized species" with "adjusted to the user's level": a randomly-picked Caterpie facing a strong player gets scaled up to be a comparable threat, and a randomly-picked strong species facing a weak player gets scaled down. Same narrow-mostly/rare-outlier spread as lootbox rolling (step 2), just aimed at a different center.

### Local Battle Arena (`components/battle/BattleArena.tsx`)
- Fighter 1 selection changes from "any of 151 via dropdown" to "pick one of your owned `pokemon_instances`" (fetched from `/api/inventory`, step 2).
- Fighter 2 (opponent) selection UI is removed — no dropdown, no "Random Rival" button. On battle start/reset, the opponent is generated via `rollBotOpponent()`, using the chosen instance's `total` as the level target.
- On a player win, roll the lootbox drop (see below) via the server — the client only ever reports `{ won: true }`, never "and I should get a lootbox."

### Online battles (`app/api/rooms/**`, `components/online/OnlineBattle.tsx`)
- `fighterNumber` (a raw species number) in `POST /api/rooms` and `POST /api/rooms/[code]/join` becomes an owned `pokemon_instances` id. The server validates the id belongs to the caller before using it — same trust model as everything else in this app (never trust the client for anything that affects the outcome).
- `lib/battleEngine.ts`'s `buildFighterState()` now takes an `OwnedPokemon` (step 2) instead of a static `Pokemon`.
- On battle end (`move/route.ts`, where `result.over` is already detected today), grant the winner a lootbox unconditionally (100%, winner-only — the loser gets nothing).

### Lootbox drops + minimal stats logging
- New Route Handler `POST /api/battles/bot-result` — body `{ won: boolean }`. Server-side: if `won`, roll the 25% drop chance **on the server** (never trust a client-reported drop) and insert a `lootboxes` row if it hits. Always inserts a row into `match_results` (below) regardless of the drop outcome.
- New table `match_results`: `id`, `user_id`, `opponent` (`"bot"` or the other player's `user_id` for online), `mode` (`"bot" | "online"`), `won` (bool), `played_at`. Deliberately minimal — per your call to pull a lightweight version of match logging into this phase, this exists only to give the Dashboard (step 4) real recent-matches/win-loss data. Step 7 (Match History) later extends this into the full shape (room code, team snapshots, public leaderboard) rather than starting over.
- `move/route.ts` inserts a `match_results` row for **both** players when `result.over` — one win, one loss.

## End state

- [ ] Local Battle Arena: Fighter 1 can only be chosen from your own inventory; there's no way to pick the opponent, and its species/stats change on every reset.
- [ ] Resetting the bot fight ~10 times shows opponent stat totals roughly centered on your chosen Pokémon's total, regardless of which species got picked — not always a pushover, not always brutal, independent of species.
- [ ] Winning bot battles grants a lootbox roughly 1 in 4 times over repeated trials; inspecting the request confirms the client never sends anything but `{won: true}`.
- [ ] Winning an online battle grants the winner a lootbox every time; the loser gets none.
- [ ] Every completed battle (bot or online) inserts `match_results` row(s) — one for online's loser too.
- [ ] Creating/joining an online room with a `pokemon_instances` id you don't own is rejected server-side.
- [ ] `npm run build` / `npm run lint` clean.

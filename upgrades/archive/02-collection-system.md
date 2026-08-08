# Step 2: Collection system (starters, lootboxes, owned Pokémon instances)

## Why here

This replaces the old "UI upgrades" step. The dashboard, inventory, and battle rework the rest of this phase depends on all need one thing first: a real data model for "which specific Pokémon does this account own, with which rolled stats and moves." Nothing else in this phase can be built without that existing, so it goes first.

This step is data/backend only — no new pages, no nav. It's validated through direct API calls, the same way step 1 (auth) was.

## What changes

### Database
- New `pokemon_instances` table: `id` (uuid pk), `user_id` (uuid, references `auth.users`, cascade delete), `pokemon_number` (text — the species, matches `lib/data/pokedex.json` keys, not a DB foreign key since species data is static JSON rather than a table), `hp`, `atk`, `def`, `spatk`, `spdef`, `spd` (int, the rolled stats for this specific instance), `total` (int, stored sum of the six), `moves` (jsonb, 4 rolled `Move` objects), `is_starter` (bool, default false), `created_at`.
- New `lootboxes` table: `id` (uuid pk), `user_id` (uuid, references `auth.users`, cascade delete), `opened_at` (timestamptz, **null = unopened**, sitting in inventory), `created_at`.
- RLS enabled on both, scoped `auth.uid() = user_id` — same defense-in-depth pattern as `user_pokedex` in step 1 (actual access still goes through Route Handlers with the secret key, not direct client queries).
- Extend the `handle_new_user` trigger from `01-auth.md` (or add a second trigger on the same `auth.users` insert) to grant exactly 3 starter `pokemon_instances` rows at signup: Charmander (#004), Squirtle (#007), Bulbasaur (#001), with **fixed, non-randomized stats and moveset** copied straight from the static Pokedex data (`is_starter = true`). Starters are guaranteed gear, not lootbox rewards, so they don't go through the roll — this is a default worth confirming once you see it in practice, not a hard requirement from the request.
- Repurpose `user_pokedex` (from step 1): drop the `acquired` boolean — "caught" becomes a derived fact (does the user own ≥1 `pokemon_instances` row for that species), not something stored. Keep `user_id` + `pokemon_number` + `notes` for species-level annotations (the Pokedex tab's notes feature survives; per-species notes are independent of how many instances you own).

### Move pool
- New `lib/data/movePool.ts` — a flat, type-tagged catalog of moves, built by deduplicating the moves already embedded per-species in `lib/data/pokedex.json` (many moves like "Tackle" or "Vine Whip" already repeat across multiple species today, so this is a dedup pass, not new content).

### Rolling logic (`lib/collection.ts`, pure functions — no DB access, easy to reason about and reuse from step 3's bot generation)
- `rollStat(base: number): number` — one stat sampled from a normal distribution centered on `base`, narrow spread (mostly close to `base`), clamped to a sane floor so it can't roll something degenerate. Per your decision, **each of the 6 stats is rolled independently** — an instance can be freakishly strong in one stat and weak in another.
- `rollMoveset(pokemon: Pokemon): Move[]` — picks 4 moves from the move pool: ~85% chance per slot of a move matching one of the pokemon's own type(s), ~15% chance of any type (the "rare cases" from the request). Percentages are a starting default, easy to tune later.
- `rollInstance(pokemon: Pokemon): RolledStats` — applies `rollStat` to all 6 base stats + `rollMoveset`, returning the shape that gets inserted into `pokemon_instances`.

### Types
- New `OwnedPokemon` in `types/pokemon.ts`: instance `id` + species display fields (`number`, `name`, `type1`, `type2` — looked up from static Pokedex data by `pokemon_number`) + the instance's own rolled `hp`/`atk`/`def`/`spatk`/`spdef`/`spd`/`total`/`moves`. This is what `FighterState.pokemon` needs to become compatible with once step 3 reworks battles to use owned instances instead of raw species.

### Route Handlers
- `GET /api/inventory` — the user's `pokemon_instances` + unopened `lootboxes`.
- `POST /api/inventory/lootboxes/[id]/open` — validates the lootbox is owned by the caller and unopened, picks a species uniformly at random from all 151 (can duplicate a species already owned — that's explicitly allowed), rolls it via `rollInstance`, inserts the new `pokemon_instances` row, stamps the lootbox's `opened_at`, returns the new instance.
- `DELETE /api/inventory/pokemon/[id]` — validates ownership, deletes the instance (the "discard" action).
- `app/api/user-data/[number]/route.ts` (existing, from step 1) — trimmed to notes-only; `acquired` is no longer a writable field.
- `app/api/user-data/route.ts` (existing) — GET now derives each species' "caught" status from distinct `pokemon_number`s in `pokemon_instances` instead of reading a stored boolean.

## End state

- [ ] Signing up grants exactly 3 `pokemon_instances` rows (Charmander/Squirtle/Bulbasaur) with fixed stats/moveset matching the static Pokedex data, not rolled ones.
- [ ] Opening an owned, unopened lootbox creates a new `pokemon_instances` row; opening several in a row shows stats varying between instances of the same species (not identical every time), and movesets leaning toward — but not exclusively — the species' own type(s).
- [ ] Opening an already-opened lootbox, or one belonging to another account, is rejected.
- [ ] Discarding an instance removes it from `GET /api/inventory` and is rejected for instances you don't own.
- [ ] `GET /api/user-data` reports a species as caught if and only if the account owns ≥1 instance of it.
- [ ] RLS policies exist on `pokemon_instances` and `lootboxes`; `npm run build` / `npm run lint` clean.

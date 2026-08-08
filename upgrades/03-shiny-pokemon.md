# Step 3: Shiny Pokémon

## Why here

Independent of every other step — pure computation over data that already
exists (`pokemon_instances` rows + the static species/move data in
`lib/pokedex.ts`/`lib/data/movePool.ts`). No migration, no new RNG roll at
lootbox-open time, nothing else needs to be built first. It's listed before
steps 2 and 4 because both benefit from having something to show ("...and
it's shiny!" in the result dialog; the shiny reveal moment in the card-pack
opening), but neither hard-depends on it — this step can genuinely be built
whenever.

## What changes

### The rule
A specific owned instance (not a species — two Charizards can differ) is
shiny if its rolled stats *and* rolled moveset both land in roughly the top
10% of what that species could have rolled. Computed at read time, not
stored:

- **Stat score**: a z-score of the instance's `total` against that
  species' own roll distribution. `lib/collection.ts`'s `rollStatAround()`
  already defines each stat as `N(speciesStat, (speciesStat *
  STAT_SPREAD_RATIO)²)` (independently per stat); `total` is their sum, so
  its distribution is `N(species.total, Σ(speciesStat_i * 0.12)²)`. `z_stat
  = (instance.total - species.total) / sqrt(Σ variance_i)`.
- **Moveset score**: a z-score of the instance's 4 rolled moves' average
  `power` against the pool `rollMoveset()` actually draws from for that
  species (its own-type pool 85% of the time, the full move pool 15% of
  the time, per `SAME_TYPE_CHANCE`). Compute the mixture's mean/variance
  from the two static pools once (cached, not recomputed per Pokémon) and
  z-score the instance's average move power against
  `mean / sqrt(variance / 4)` (averaging 4 draws).
- **Combined score**: `(z_stat + z_moves) / 2`. Shiny if this is `≥
  1.2816` (the standard 90th-percentile cutoff).
- This is an approximation, not an exact 10% by construction (averaging two
  z-scores isn't the same as a joint 10th-percentile cutoff, and move
  slots are drawn without replacement). **Treat the threshold constant as a
  default to tune, not a hard requirement**: once built, roll a large
  sample of lootboxes (see End state) and adjust `1.2816` up or down if the
  observed shiny rate is meaningfully off from ~10%.
- **Starters are never shiny** — they're fixed gear, not a roll (see the
  original plan's step 2), so there's no distribution to compare against.
  `lib/shiny.ts`'s check short-circuits to `false` when `isStarter` is
  true.
- `STAT_SPREAD_RATIO` needs to be exported from `lib/collection.ts` (it's
  currently a private module constant) so `lib/shiny.ts` can reuse the
  exact same number instead of duplicating it.

### New module
`lib/shiny.ts` — `isShinyInstance(pokemon: OwnedPokemon): boolean`, taking
an already-assembled `OwnedPokemon` (species fields + rolled stats/moves
are already all on that type) and looking up the species' base stats via
the existing `getPokemon()` pokedex lookup internally.

### Client
Everywhere an *owned* instance's sprite renders, swap `form="normal"` for
`form={isShinyInstance(pokemon) ? "shiny" : "normal"}` and add a small
"✨ Shiny" badge — a new scoped class (e.g. `.shiny-badge`, styled like the
existing `.caught-badge`) in `app/globals.css`, not a component-library
import:
- Inventory grid & list cards (`PokemonInstanceCard.tsx`)
- Inventory detail panel
- Dashboard's top-3-Pokémon team preview
- `FighterCard.tsx`, used by both `BattleArena.tsx` and `OnlineBattle.tsx`
  — this also means a bot's rolled team (step 1) can come back shiny too,
  which needs no special-casing: it's the same `OwnedPokemon` shape, just
  never persisted.
- **Not** touched: `components/pokedex/PokemonDetail.tsx`'s existing
  side-by-side normal/shiny sprite preview in the Pokédex tab — that's a
  species-level "here's what shiny looks like" preview unrelated to
  ownership, and stays exactly as it is today.

### A free side effect worth flagging to the user
Because shininess is computed at read time from data that already exists,
every Pokémon anyone already owns gets evaluated the moment this ships —
some existing inventories may suddenly show shinies they didn't know they
had. This is expected, not a bug, and needs no backfill migration.

## End state

- [x] `lib/shiny.ts` computes shininess purely from an `OwnedPokemon` +
      static species/move data — no new database column, no migration.
- [x] Roll a large sample of lootboxes (e.g. 200+ via a disposable test
      account) and confirm the observed shiny rate is roughly ~10%,
      adjusting the threshold constant if it's noticeably off.
- [x] Shiny instances show the shiny sprite + badge everywhere an owned
      Pokémon's sprite appears: inventory grid, inventory list, inventory
      detail panel, dashboard team preview, and both battle arenas.
- [x] Starters never show as shiny, regardless of their stats.
- [x] An existing (pre-feature) high-stat test instance retroactively shows
      as shiny immediately after deploying, with no manual data migration.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-07)

- `npm run build` and `npm run lint` both clean.
- `lib/collection.ts` now exports `STAT_SPREAD_RATIO`, `SAME_TYPE_CHANCE`,
  and `MOVE_SLOTS` (all previously private) so `lib/shiny.ts` reuses the
  exact same constants rather than duplicating them.
- Discovered and fixed a latent type looseness while wiring this in:
  `FighterState.pokemon` (`types/pokemon.ts`) was typed as the species-level
  `Pokemon`, but every real call site (`buildFighterState`/`buildTeamState`,
  used exclusively with `OwnedPokemon[]` throughout bot/online battles)
  always passes an actual `OwnedPokemon` — TypeScript's structural typing
  silently allowed this. Retyped it to `OwnedPokemon` so `FighterCard.tsx`
  (used by both battle modes) can correctly read `isStarter`/shiny status
  off it; this is a type-accuracy fix, not a behavior change.
- Threshold tuning: the plan's naive "90th percentile of a standard normal"
  constant (1.2816) assumes the combined score has variance 1, but
  averaging two roughly-independent z-scores gives variance ~0.5 — using
  1.2816 as-is produced only a ~4.4% shiny rate in a 20,000-roll pure
  simulation. Retuned to `0.9061` (≈ `1.2816 * sqrt(0.5)`), which produced
  ~10.7% in the same simulation.
- Ran a temporary pure-engine simulation (deleted after running, no server
  needed): 20,000 rolls via the actual `rollInstance()` pipeline → 10.68%
  shiny; starters never shiny across 2,000 trials even with an artificially
  doubled-stat roll; an exact-species-average instance was shiny 0/500
  times; a 2x-base-stat instance was reliably shiny.
- Ran a temporary live end-to-end validation (deleted after running)
  against a disposable Supabase test account and a local dev server: 250
  real lootboxes opened through the actual
  `POST /api/inventory/lootboxes/[id]/open` endpoint → persisted
  `pokemon_instances` rows read back and scored with the real
  `isShinyInstance()` → 30/250 (12.0%) shiny, within the target band. Also
  hand-inserted a `pokemon_instances` row with doubled stats directly via
  the Supabase admin client (bypassing `rollInstance()`/the open endpoint
  entirely, simulating a row that existed before this feature shipped) and
  confirmed it read as shiny immediately, with no backfill step.
- Confirmed `GET /dashboard`, `/inventory`, `/battle`, `/online`, and
  `/pokedex` all still render 200 with no error boundary for an
  authenticated session after the `FighterState.pokemon` retype and the new
  `lib/shiny.ts` import across five components.
- Not verified (no browser automation tool available in this environment):
  actually seeing the shiny sprite variant and gold badge rendered on
  screen — the sprite-form switch (`form={shiny ? "shiny" : "normal"}`) and
  badge markup were reviewed by hand, not viewed in a browser. The
  `shiny`/`normal` sprite asset pairing itself was already exercised by the
  pre-existing Pokédex tab's side-by-side preview, unrelated to this step.

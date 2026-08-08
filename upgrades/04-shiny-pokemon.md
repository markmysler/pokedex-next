# Step 4: Shiny Pokémon

## Why here

Independent of every other step — pure computation over data that already
exists (`pokemon_instances` rows + the static species/move data in
`lib/pokedex.ts`/`lib/data/movePool.ts`). No migration, no new RNG roll at
lootbox-open time, nothing else needs to be built first. It's listed before
steps 3 and 5 because both benefit from having something to show ("...and
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
"✨ Shiny" `Badge` (shadcn, per step 1):
- Inventory grid & list cards (`PokemonInstanceCard.tsx`)
- Inventory detail panel
- Dashboard's top-3-Pokémon team preview
- `FighterCard.tsx`, used by both `BattleArena.tsx` and `OnlineBattle.tsx`
  — this also means a bot's rolled team (step 2) can come back shiny too,
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

- [ ] `lib/shiny.ts` computes shininess purely from an `OwnedPokemon` +
      static species/move data — no new database column, no migration.
- [ ] Roll a large sample of lootboxes (e.g. 200+ via a disposable test
      account) and confirm the observed shiny rate is roughly ~10%,
      adjusting the threshold constant if it's noticeably off.
- [ ] Shiny instances show the shiny sprite + badge everywhere an owned
      Pokémon's sprite appears: inventory grid, inventory list, inventory
      detail panel, dashboard team preview, and both battle arenas.
- [ ] Starters never show as shiny, regardless of their stats.
- [ ] An existing (pre-feature) high-stat test instance retroactively shows
      as shiny immediately after deploying, with no manual data migration.
- [ ] `npm run build` / `npm run lint` clean.

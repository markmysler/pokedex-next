# Step 51: Evolution — API route + Inventory UI/reveal

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Last step of the evolution slice — needs step 49's computed result and step
50's atomic write path to both exist before there's anything to wire a
route or button to.

## What changes

### `app/api/inventory/evolve/route.ts` (new)

Modeled directly on `app/api/inventory/tradeup/route.ts`:

1. Auth check (`getCurrentUser()`).
2. Body validation: exactly 5 `pokemonInstanceIds` (strings).
3. Fetch the 5 instances server-side (`getOwnedPokemonInstances`), reject if
   any are missing, starters, or not all the same `pokemon_number` — a fast,
   specific error message; the RPC re-validates for real.
4. Look up `evolvesInto` for that species from `lib/pokedex.ts`. If `null`,
   reject with "this Pokemon has no evolution." If it's an array (Eevee),
   pick one entry uniformly at random over its current length (step 49's
   job, called from this route) — 3-way at this step, growing to 4-way once
   step 52 appends Umbreon, with no change needed here.
5. Call `deriveEvolvedStats()` (step 49) + `rollMoveset()` for the resolved
   target species.
6. Call the `evolve_pokemon` RPC (step 50) with the 5 ids + target number +
   computed stats/moves.
7. Return the new instance's id (and enough info for the client to show a
   reveal — species name/number at minimum).

### Inventory UI (`components/inventory/InventoryPageClient.tsx`)

An "Evolve" action alongside the existing Trade Up flow — same "select 5 of
a kind" picker interaction, but scoped to same-species selection (Trade Up
allows any 5; Evolve only enables once 5 of the *same* species with a
non-null `evolvesInto` are selected). Disabled/hidden entirely for a species
with no evolution, same spirit as any other conditionally-available action
in this UI.

### Reveal dialog

Reuses `LootboxRevealDialog`'s drumroll → sprite → stats → moves pacing
(new component or a parameterized variant — implementation's call) rather
than inventing new reveal choreography. For Eevee specifically, the reveal
is the first place the player learns which branch they got — there's no
"waiting" state before that, the random pick already happened server-side
in the API call.

### What does NOT change in this step

- No new DB objects — this step only calls what step 50 created.
- Trade Up itself is untouched.

## End state

- [ ] `POST /api/inventory/evolve` validates ownership/species-match/
      evolution-eligibility server-side, calls `evolve_pokemon`, returns the
      new instance.
- [ ] Inventory UI shows an Evolve action when 5-of-a-kind with a real
      evolution are selected, hidden/disabled otherwise.
- [ ] Reveal dialog shows the result with the same pacing as a lootbox open.
- [ ] Manual end-to-end check (real account, real 5 duplicates — this
      environment has no GUI, so exercised via the real route handler code
      directly plus a Supabase read-back, same substitute pattern
      `archive/v6/main.md` used for step 43's validation): burning 5 Pikachu
      removes exactly those 5 rows and adds exactly 1 Raichu row with
      derived stats in the expected range; burning 5 Eevee lands on one of
      the current branches (3 at this step) with roughly even distribution
      over repeated dry runs — re-check this once step 52 grows the branch
      to 4.
- [ ] `npm run build` / `npm run lint` clean.

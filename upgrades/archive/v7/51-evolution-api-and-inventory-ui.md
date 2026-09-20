# Step 51: Evolution — API route + Inventory UI/reveal

**Status: shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.
This closes out the evolution slice (48-51) — Evolve is fully usable
end-to-end against the local Supabase instance now.

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

- [x] `POST /api/inventory/evolve` validates ownership/species-match/
      evolution-eligibility server-side, calls `evolve_pokemon`, returns the
      new instance.
- [x] Inventory UI shows an Evolve action when 5-of-a-kind with a real
      evolution are selected, hidden/disabled otherwise.
- [x] Reveal dialog shows the result with the same pacing as a lootbox open.
- [x] Manual end-to-end check (real account, real 5 duplicates — this
      environment has no GUI, so exercised via the real route handler code
      directly plus a Supabase read-back, same substitute pattern
      `archive/v6/main.md` used for step 43's validation): burning 5 Pikachu
      removes exactly those 5 rows and adds exactly 1 Raichu row with
      derived stats in the expected range; burning 5 Eevee lands on one of
      the current branches (3 at this step) with roughly even distribution
      over repeated dry runs — re-check this once step 52 grows the branch
      to 4.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

Implemented and validated on `v7` against the local Supabase instance, and
went further than the "extract source and re-run it" substitute pattern
step 43 used: this environment now has a real local dev server + local
Supabase (which didn't exist yet when that precedent was written), so this
step was exercised as literal, unmodified end-to-end HTTP traffic against
the actual committed route file — closer to a real browser session than
the archive precedent could get.

- `app/api/inventory/evolve/route.ts` (new): auth check, body validation,
  ownership/starter/species-match pre-check via `getOwnedPokemonInstances`,
  `evolvesInto` lookup + `resolveEvolutionTarget()` branch resolution,
  `deriveEvolvedStats()` + `rollMoveset()` (both step 49), `evolve_pokemon`
  RPC call (step 50), then reads back the new row via
  `getOwnedPokemonInstance` to return a full `OwnedPokemon` to the client
  (same shape the reveal dialog already expects).
- `types/supabase.ts` (hand-maintained, not auto-generated in this project):
  added `evolve_pokemon`'s `Args`/`Returns` shape alongside the other RPCs,
  needed for `supabase.rpc("evolve_pokemon", ...)` to type-check.
- `components/inventory/LootboxRevealDialog.tsx`: added optional
  `drumrollIcon`/`drumrollText` props (default to the existing lootbox
  copy, so every other call site is unaffected) rather than a new
  component or a full parameterized fork — the only actual difference
  Evolve needs from a lootbox reveal is the drumroll copy ("🧬 Evolving..."
  vs. "📦 Opening lootbox..."); everything else (sprite/stats/moves pacing)
  is identical and correctly reused as-is.
- `components/inventory/InventoryPageClient.tsx`: new Evolve mode,
  mutually exclusive with Trade Up mode (entering one exits the other).
  `evolveDisabledReason()` disables a card when it's a starter, its species
  has no evolution (`evolvesInto === null`), or it doesn't match whichever
  species is already selected (`evolveSpeciesNumber`) -- enforcing "5 of
  the same species" the same way Trade Up enforces "not a starter," via
  the existing generic `disabled`/`disabledReason` props on
  `PokemonInstanceCard`. Confirm modal + bottom bar mirror Trade Up's
  structure; a separate `evolveReveal` state (not the batch `revealQueue`)
  since evolving always yields exactly 1 result.
- `app/globals.css`: `.btn-evolve` (accent color, mirrors `.btn-tradeup`'s
  accent-2 pill) + `.evolve-bar`/`.evolve-count`/`.evolve-confirm-list`
  (identical layout to their trade-up counterparts, kept as separate rules
  rather than a shared selector so either can be restyled independently).

### Validation performed (real HTTP against the real running dev server)

Session cookies were generated using the actual `@supabase/ssr` package
this app depends on (not a reimplementation of its cookie format) — a
small script calls `createServerClient()` with an in-memory cookie store,
signs in via `auth.signInWithPassword()`, and captures the real
`sb-...-auth-token` cookie `@supabase/ssr` writes, then that cookie is sent
as a normal `Cookie` header to `http://localhost:3000/api/inventory/evolve`
— the literal, unmodified, committed route file runs exactly as it would
in production, through real `getCurrentUser()`/`getSupabaseSsrServerClient()`
cookie-based auth.

- Happy path: 5 real non-starter Pikachu → 1 Raichu (026) with a valid
  4-move set (3 damage + 1 support, matching `rollMoveset()`'s guarantee)
  and stats in a sane range; DB read-back confirmed exactly those 5 rows
  gone and exactly 1 new row, starters untouched.
- Route-level validation (distinct from step 50's RPC-level checks —
  these are `evolve`'s own pre-checks, not exercised at all by step 50's
  testing since the RPC doesn't know about `evolvesInto`):
  - No-evolution species (5 Snorlax) → `"This Pokemon has no evolution"`.
  - Mixed species (4 Rattata + 1 Spearow) → `"All 5 must be the same
    species"`.
  - Starter included → `"Starters can't evolve"`.
  - Wrong count (4 ids) → `"Exactly 5 Pokemon are required"`.
  - Confirmed no partial deletion after any rejected call.
- Eevee's 3-way branch: 30 live end-to-end evolve calls through the real
  route landed 15 Vaporeon / 8 Jolteon / 7 Flareon — consistent with
  uniform random at this sample size (not a red flag on its own), and
  consistent with step 49's much larger 30,000-trial check of the same
  underlying `resolveEvolutionTarget()` function (9,891/10,116/9,893).
  Confirms the live wiring actually calls it correctly, not just the
  isolated unit.
- `npm run lint` / `npm run build` clean.

# Step 49: Evolution — derived-stat formula + moveset roll

**Status: shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Pure computation, no DB/API involved — needs step 48's `evolvesInto` to know
what species to derive stats *for*, and needs to exist before step 51's API
route has anything to call. Independent of step 50 (the atomic write path);
order between them doesn't matter.

## What changes

### The problem

Evolving isn't a fresh roll (that'd make evolution pointless next to just
opening another lootbox) and isn't a plain average either (that ignores how
the existing roll system already measures "how lucky was this roll" —
`lib/shiny.ts` computes exactly that as a z-score, purely to gate the shiny
check). The goal: **5 unusually strong Pikachu should tend to produce an
unusually strong (possibly even shiny-caliber) Raichu.**

### The formula (new `lib/evolution.ts`)

Reuses `STAT_SPREAD_RATIO` (`lib/collection.ts`) and the same
z-score-against-own-species-distribution convention `lib/shiny.ts` already
established, rather than inventing a new statistical model:

For each of the 6 stats (hp/atk/def/spatk/spdef/spd):

1. For each of the 5 burned instances, compute its z-score against *its
   own* (pre-evolution) species' base stat:
   `z_i = (instance.stat - preEvoSpecies.stat) / (preEvoSpecies.stat * STAT_SPREAD_RATIO)`
2. Average the 5 z-scores: `avgZ = mean(z_1..z_5)`
3. Re-apply that average z-score to the **evolved** species' own
   distribution, then clamp exactly like `rollStatAround` does:
   ```ts
   const spread = evolvedSpecies.stat * STAT_SPREAD_RATIO;
   const rolled = evolvedSpecies.stat + avgZ * spread;
   const newStat = Math.max(1, Math.round(Math.max(evolvedSpecies.stat * STAT_FLOOR_RATIO, rolled)));
   ```

`STAT_FLOOR_RATIO` isn't currently exported from `lib/collection.ts` — export
it alongside `STAT_SPREAD_RATIO` rather than duplicating the constant.

```ts
// lib/evolution.ts
type DerivedStats = Pick<RolledStats, "hp" | "atk" | "def" | "spatk" | "spdef" | "spd">;

export function deriveEvolvedStats(
  burned: Pick<OwnedPokemon, "hp" | "atk" | "def" | "spatk" | "spdef" | "spd" | "number">[],
  evolvedSpecies: Pokemon
): DerivedStats {
  // For each stat key: average the 5 burned instances' z-scores against
  // their own (pre-evolution) species, then re-center on evolvedSpecies
  // per the formula above. Implementation detail, not finalized here.
}
```

### Moveset: a fresh roll, not derived

There's no equivalent "derive" operation for a categorical pick the way
there is for a continuous stat — averaging 5 movesets doesn't mean
anything. Confirmed directly with the user during planning: the evolved
instance's moveset is a plain `rollMoveset(evolvedSpecies)` call, identical
to what a fresh lootbox catch of that species would get. This is the one
place this step's output *isn't* "derived from the 5."

### Eevee's branch

`evolvesInto` being `string | string[]` (step 48) means the resolution logic
here should pick uniformly at random over **however many entries the array
holds**, not a hardcoded "1 of 3" — Eevee ships with 3 (Vaporeon/Jolteon/
Flareon, step 48) but step 52 appends a 4th (Umbreon), and this logic should
need no change when that happens. The pick happens here, server-side,
before the stat derivation runs — the derivation formula above doesn't care
which branch it's centering on, it just needs a resolved `evolvedSpecies`
by the time it runs. `Math.random()`-driven, same convention every other
roll in this codebase already uses (no need for a cryptographically strong
RNG here any more than `rollStatAround` needs one).

### What does NOT change in this step

- No DB access — this is pure computation over already-fetched instance
  data, called from within step 51's Route Handler before it hands the
  result to step 50's `evolve_pokemon` RPC as parameters.
- `lib/shiny.ts`'s own `isShinyInstance()` isn't touched — it already
  works on any `OwnedPokemon`, including one produced by this step, with no
  changes needed (an evolved instance is shiny-eligible on exactly the same
  terms as a rolled one, since the derivation is designed to land on the
  same distribution shiny scoring already expects).

## End state

- [x] `lib/evolution.ts` exports a function that takes 5 burned instances
      (same species) + the resolved evolved species and returns
      `RolledStats`-shaped stats via the z-score formula above.
- [x] Eevee's branch resolves via a uniform random pick over
      `evolvesInto.length` entries (3 at this step; step 52 grows it to 4
      with no logic change required here) before derivation runs.
- [x] Moveset comes from a plain `rollMoveset()` call on the evolved
      species — explicitly not derived.
- [x] A throwaway validation script (same pattern step 40/41 used):
      simulate burning 5 near-max-roll instances of several species and
      confirm the derived result skews high (ideally shiny-eligible some
      meaningful fraction of the time); simulate 5 near-min-roll instances
      and confirm it skews low but still respects the evolved species'
      floor. No hard pass/fail threshold required, just "does the direction
      make sense."
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

Implemented on `v7` exactly as planned. Pure computation, no DB touched —
validated independently of the local Supabase stack (which finished coming
up in the background around the same time, confirmed separately via
`npm run db:status`).

- `STAT_FLOOR_RATIO` exported from `lib/collection.ts` alongside the
  already-exported `STAT_SPREAD_RATIO`, per the plan (no duplicated
  constant).
- New `lib/evolution.ts` exports `deriveEvolvedStats(burned, evolvedSpecies)`
  (the z-score formula above, typed exactly as `DerivedStats = Pick<
  RolledStats, "hp"|"atk"|"def"|"spatk"|"spdef"|"spd">`) and
  `resolveEvolutionTarget(evolvesInto)` (uniform pick over however many
  entries the array holds, or the plain string itself). Moveset is
  deliberately *not* wrapped here — callers call `rollMoveset()`
  (`lib/collection.ts`) directly on the resolved evolved species, as
  planned.
- Throwaway validation script (scratchpad, not committed) duplicated the
  formula against real `pokedex.json` data for 4 chains (Pikachu→Raichu,
  Charmander→Charmeleon, Magikarp→Gyarados, Abra→Kadabra), each at a fixed
  synthetic z of ±2.5 across all 5 burned instances:
  - High (+2.5): derived totals landed ~30-40% above the evolved species'
    base total (e.g. Magikarp→Gyarados: 705 vs. base 540), with a
    stat-vs-evolved-species z-score of ~5.6-6.2 — comfortably above the
    shiny threshold (0.9061) on its own, so combined with a fresh
    `rollMoveset()` roll the simulated shiny rate was 100% (99.95% for
    Abra→Kadabra) across 2000 trials each.
  - Low (-2.5): derived totals landed well below base (e.g. Pikachu→Raichu:
    342 vs. base 485) with 0% simulated shiny rate, and comfortably above
    the hard floor (not clamped at this z) — separately confirmed the floor
    itself clamps correctly at more extreme z (checked z=-4.167, the exact
    boundary where `STAT_FLOOR_RATIO` engages, and z=-6 well past it: both
    correctly floor at `Math.round(center * 0.5)`).
  - Eevee's branch pick: 30,000 trials over its 3-entry array landed
    ~9,891-10,116 each (expected ~10,000) — uniform, as intended.
- `npm run lint` clean, `npm run build` clean.

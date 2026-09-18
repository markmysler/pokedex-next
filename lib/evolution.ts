import type { OwnedPokemon, Pokemon, RolledStats } from "@/types/pokemon";
import { STAT_SPREAD_RATIO, STAT_FLOOR_RATIO } from "./collection";
import { getPokemon } from "./pokedex";

// See upgrades/49-evolution-stat-derivation-and-moveset.md for the full
// rationale. Evolving burns 5 same-species instances into 1 of the next
// stage -- not a fresh roll (that'd make evolution pointless next to just
// opening another lootbox) and not a plain average (that ignores the
// existing roll system's own notion of "how lucky was this roll," which
// lib/shiny.ts already measures as a z-score). Reusing that same
// z-score-against-own-species-distribution convention: average the 5
// burned instances' z-scores against *their* species, then re-center that
// average on the *evolved* species' distribution, clamped exactly like a
// fresh rollStatAround() roll.

type StatKey = "hp" | "atk" | "def" | "spatk" | "spdef" | "spd";
const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spatk", "spdef", "spd"];

export type DerivedStats = Pick<RolledStats, StatKey>;

// Only the fields the formula actually reads -- callers (step 51's Route
// Handler) pass real OwnedPokemon rows, this just doesn't require more than
// it needs.
export type BurnedInstance = Pick<OwnedPokemon, StatKey | "number">;

// z-score of a single rolled stat value against the species it was rolled
// from -- same shape as rollStatAround()'s own distribution
// (N(speciesStat, (speciesStat * STAT_SPREAD_RATIO)^2)), just inverted to
// score an already-rolled value instead of producing one.
function statZScore(value: number, speciesStat: number): number {
  const spread = speciesStat * STAT_SPREAD_RATIO;
  if (spread <= 0) return 0;
  return (value - speciesStat) / spread;
}

// Picks the evolved species' dex number for a (possibly branching)
// `evolvesInto` value. A plain string has exactly one branch and always
// resolves to itself; an array (Eevee today, 3 entries; step 52 grows it to
// 4) resolves via a uniform random pick over however many entries it holds
// -- this needs no change when the array grows. Not a player choice (see
// upgrades/main.md's key decisions) -- decided here, server-side, before
// stat derivation runs.
export function resolveEvolutionTarget(evolvesInto: string | string[]): string {
  if (typeof evolvesInto === "string") return evolvesInto;
  if (evolvesInto.length === 0) {
    throw new Error("resolveEvolutionTarget: evolvesInto array is empty");
  }
  return evolvesInto[Math.floor(Math.random() * evolvesInto.length)];
}

// The derived-stat formula itself: for each of the 6 stats, average the 5
// burned instances' z-scores against their own (pre-evolution) species,
// then re-apply that average z-score to the evolved species' own
// distribution and clamp exactly like rollStatAround() does.
//
// `burned` is expected to be exactly 5 instances of the same pre-evolution
// species -- that invariant is enforced by step 50's DB transaction (which
// re-validates ownership/species-match server-side), not re-checked here;
// this function is pure computation over whatever it's handed.
export function deriveEvolvedStats(burned: BurnedInstance[], evolvedSpecies: Pokemon): DerivedStats {
  const result = {} as DerivedStats;

  for (const key of STAT_KEYS) {
    const zScores = burned.map((instance) => {
      const preEvoSpecies = getPokemon(instance.number);
      return statZScore(instance[key], preEvoSpecies[key]);
    });
    const avgZ = zScores.reduce((sum, z) => sum + z, 0) / zScores.length;

    const center = evolvedSpecies[key];
    const spread = center * STAT_SPREAD_RATIO;
    const rolled = center + avgZ * spread;
    result[key] = Math.max(1, Math.round(Math.max(center * STAT_FLOOR_RATIO, rolled)));
  }

  return result;
}

// Moveset is deliberately NOT derived -- there's no equivalent "average" of
// 5 movesets. The evolved instance's moveset is a plain rollMoveset() call
// on the evolved species (lib/collection.ts), identical to what a fresh
// lootbox catch of that species would roll. Callers (step 51) call
// rollMoveset(evolvedSpecies) directly; nothing to wrap here.

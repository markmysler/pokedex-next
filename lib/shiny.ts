import type { Move, OwnedPokemon, Pokemon, PokemonType } from "@/types/pokemon";
import { getPokemon } from "./pokedex";
import { allMoves, movesByType } from "./data/movePool";
import { MOVE_SLOTS, SAME_TYPE_CHANCE, STAT_SPREAD_RATIO } from "./collection";
import { movePower } from "./pokemonDisplay";

// A specific owned instance (not a species) is shiny if its rolled stats
// *and* rolled moveset both land in roughly the top 10% of what that
// species could have rolled — see upgrades/03-shiny-pokemon.md for the
// full derivation. This is an approximation, not an exact 10% by
// construction (averaging two roughly-independent z-scores gives a
// combined score with variance ~0.5, not 1 — so the raw "90th percentile
// of a standard normal" constant (1.2816) undershoots badly; empirically
// tuned down to hit ~10% against 20,000 simulated rolls; re-tune if the
// observed rate drifts far from that).
const SHINY_ZSCORE_THRESHOLD = 0.9061;

interface MovePowerStats {
  mean: number;
  variance: number;
}

function movePowerStats(moves: Move[]): MovePowerStats {
  const mean = moves.reduce((sum, m) => sum + (movePower(m) ?? 0), 0) / moves.length;
  const variance = moves.reduce((sum, m) => sum + ((movePower(m) ?? 0) - mean) ** 2, 0) / moves.length;
  return { mean, variance };
}

const allMovesStats = movePowerStats(allMoves);

// Keyed by type1|type2 (the only thing rollMoveset()'s pool choice depends
// on) — computed once per type combination the first time it's needed, not
// recomputed per Pokémon (upgrades/03-shiny-pokemon.md).
const mixtureStatsCache = new Map<string, MovePowerStats>();

// Mean/variance of a single rollMoveset() draw's power for this species'
// types: a mixture of its own-type pool (SAME_TYPE_CHANCE of the time) and
// the full move pool (the rest), via the law of total variance.
function moveMixtureStats(type1: PokemonType, type2: PokemonType | null): MovePowerStats {
  const key = `${type1}|${type2 ?? ""}`;
  const cached = mixtureStatsCache.get(key);
  if (cached) return cached;

  const ownTypes = [type1, type2].filter((t): t is PokemonType => Boolean(t));
  const ownTypePool = ownTypes.flatMap((t) => movesByType[t] ?? []);

  const stats = ownTypePool.length === 0
    ? allMovesStats
    : (() => {
        const own = movePowerStats(ownTypePool);
        const p = SAME_TYPE_CHANCE;
        const mean = p * own.mean + (1 - p) * allMovesStats.mean;
        const variance =
          p * own.variance +
          (1 - p) * allMovesStats.variance +
          p * (1 - p) * (own.mean - allMovesStats.mean) ** 2;
        return { mean, variance };
      })();

  mixtureStatsCache.set(key, stats);
  return stats;
}

// z-score of the instance's `total` against that species' own roll
// distribution: each stat is rolled independently as
// N(speciesStat, (speciesStat * STAT_SPREAD_RATIO)²), so `total`'s
// distribution is N(species.total, Σ variance_i).
function statZScore(instance: OwnedPokemon, species: Pokemon): number {
  const speciesStats = [species.hp, species.atk, species.def, species.spatk, species.spdef, species.spd];
  const variance = speciesStats.reduce((sum, s) => sum + (s * STAT_SPREAD_RATIO) ** 2, 0);
  if (variance <= 0) return 0;
  return (instance.total - species.total) / Math.sqrt(variance);
}

// z-score of the instance's 4 rolled moves' average power against the
// mixture pool rollMoveset() actually draws from for this species,
// averaged over MOVE_SLOTS draws (variance of a mean shrinks by 1/n).
function moveZScore(instance: OwnedPokemon, species: Pokemon): number {
  if (instance.moves.length === 0) return 0;
  const { mean, variance } = moveMixtureStats(species.type1, species.type2);
  const avgPower = instance.moves.reduce((sum, m) => sum + (movePower(m) ?? 0), 0) / instance.moves.length;
  const standardError = Math.sqrt(variance / MOVE_SLOTS);
  if (standardError <= 0) return 0;
  return (avgPower - mean) / standardError;
}

export function isShinyInstance(pokemon: OwnedPokemon): boolean {
  // Starters are fixed gear, not a roll (original plan's step 2) — no
  // distribution to compare against, so they can never be shiny.
  if (pokemon.isStarter) return false;

  const species = getPokemon(pokemon.number);
  const combined = (statZScore(pokemon, species) + moveZScore(pokemon, species)) / 2;
  return combined >= SHINY_ZSCORE_THRESHOLD;
}

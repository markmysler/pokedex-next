import pokedexJson from "./pokedex.json";
import type { Move, Pokedex, PokemonType } from "@/types/pokemon";

// Deduplicated, type-tagged catalog of every move already embedded
// per-species in pokedex.json (many, like "Tackle", already repeat across
// species). Used by lib/collection.ts to roll movesets for lootbox-acquired
// Pokemon — this is a pool to sample from, independent of any one species'
// canonical moveset (which stays as static Pokedex reference data).
const pokedex = pokedexJson as unknown as Pokedex;

const byName = new Map<string, Move>();
for (const pokemon of Object.values(pokedex)) {
  for (const move of pokemon.moves) {
    if (!byName.has(move.name)) byName.set(move.name, move);
  }
}

export const allMoves: Move[] = Array.from(byName.values());

export const movesByType: Partial<Record<PokemonType, Move[]>> = {};
for (const move of allMoves) {
  (movesByType[move.type] ??= []).push(move);
}

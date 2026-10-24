import { rollInstance, toOwnedPokemon } from "@/lib/collection";
import { getPokemon } from "@/lib/pokedex";
import type { OwnedPokemon } from "@/types/pokemon";

// A real species with real rolled moves, so tests exercise the same data
// the game uses. Stats can be overridden to make outcomes predictable.
export function makePokemon(number: string, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  const species = getPokemon(number);
  if (!species) throw new Error(`no species ${number}`);
  const rolled = rollInstance(species);
  const owned = toOwnedPokemon(
    {
      id: `test-${number}-${Math.random().toString(36).slice(2)}`,
      pokemon_number: species.number,
      ...rolled,
      moves: rolled.moves,
      is_starter: false,
      nickname: null,
    },
    species
  );
  return { ...owned, ...overrides };
}

export function makeTeam(numbers: [string, string, string]): OwnedPokemon[] {
  return numbers.map((n) => makePokemon(n));
}

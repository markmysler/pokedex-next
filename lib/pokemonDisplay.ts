import type { OwnedPokemon } from "@/types/pokemon";

// The primary label for an owned instance: its nickname if the owner set
// one, otherwise the species name (upgrades/08-pokemon-nicknames.md). One
// shared helper instead of repeating `pokemon.nickname ?? pokemon.name` at
// every display site.
export function displayName(pokemon: Pick<OwnedPokemon, "nickname" | "name">): string {
  return pokemon.nickname ?? pokemon.name;
}

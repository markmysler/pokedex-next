import type { PokemonType } from "@/types/pokemon";

// Refined for the v5 visual redesign (upgrades/30-design-tokens-and-foundations.md)
// — same 18-color categorical mapping pokedex-web/interfaz_pokemon.py used,
// values nudged per design/DESIGN_SYSTEM.md §1 for AA contrast on a white
// chip. Shared by both the client (badges/move buttons) and server (battle
// resolution).
export const TYPE_COLORS: Record<PokemonType, string> = {
  Normal: "#A8A878",
  Fire: "#EE8130",
  Water: "#6390F0",
  Grass: "#7AC74C",
  Electric: "#F0C93C",
  Ice: "#7FD4CF",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#D6B44A",
  Flying: "#A890F0",
  Psychic: "#F95587",
  Bug: "#9DB026",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#6C5B52",
  Steel: "#8E8EA6",
  Fairy: "#D685AD",
};

export const TYPE_MATCHUPS: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  Normal: { Rock: 0.5, Steel: 0.5, Ghost: 0.0 },
  Fire: { Grass: 2.0, Ice: 2.0, Bug: 2.0, Steel: 2.0, Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5 },
  Water: { Fire: 2.0, Ground: 2.0, Rock: 2.0, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
  Grass: { Water: 2.0, Ground: 2.0, Rock: 2.0, Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Dragon: 0.5, Steel: 0.5 },
  Electric: { Water: 2.0, Flying: 2.0, Electric: 0.5, Grass: 0.5, Dragon: 0.5, Ground: 0.0 },
  Ice: { Grass: 2.0, Ground: 2.0, Flying: 2.0, Dragon: 2.0, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Fighting: { Normal: 2.0, Ice: 2.0, Rock: 2.0, Dark: 2.0, Steel: 2.0, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Fairy: 0.5, Ghost: 0.0 },
  Poison: { Grass: 2.0, Fairy: 2.0, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0.0 },
  Ground: { Fire: 2.0, Electric: 2.0, Poison: 2.0, Rock: 2.0, Steel: 2.0, Grass: 0.5, Bug: 0.5, Flying: 0.0 },
  Flying: { Grass: 2.0, Fighting: 2.0, Bug: 2.0, Electric: 0.5, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2.0, Poison: 2.0, Psychic: 0.5, Steel: 0.5, Dark: 0.0 },
  Bug: { Grass: 2.0, Psychic: 2.0, Dark: 2.0, Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2.0, Ice: 2.0, Flying: 2.0, Bug: 2.0, Fighting: 0.5, Ground: 0.5, Steel: 0.5 },
  Ghost: { Psychic: 2.0, Ghost: 2.0, Dark: 0.5, Normal: 0.0 },
  Dragon: { Dragon: 2.0, Steel: 0.5, Fairy: 0.0 },
  Dark: { Psychic: 2.0, Ghost: 2.0, Fighting: 0.5, Dark: 0.5, Fairy: 0.5 },
  Steel: { Ice: 2.0, Rock: 2.0, Fairy: 2.0, Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5 },
  Fairy: { Fighting: 2.0, Dragon: 2.0, Dark: 2.0, Fire: 0.5, Poison: 0.5, Steel: 0.5 },
};

export function getTypeMultiplier(
  attackerType: PokemonType,
  defenderType1: PokemonType,
  defenderType2: PokemonType | null
): number {
  const table = TYPE_MATCHUPS[attackerType] ?? {};
  const m1 = table[defenderType1] ?? 1.0;
  const m2 = defenderType2 ? table[defenderType2] ?? 1.0 : 1.0;
  return m1 * m2;
}

export function getManaCost(power: number): number {
  if (power >= 120) return 45;
  if (power >= 90) return 30;
  if (power >= 60) return 20;
  if (power >= 40) return 10;
  return 0;
}

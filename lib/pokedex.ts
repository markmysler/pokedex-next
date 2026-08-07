import pokedexJson from "./data/pokedex.json";
import type { Pokedex } from "@/types/pokemon";

// Static reference data, bundled at build time — never changes at runtime,
// so it lives in the app bundle rather than in Postgres. Mirrors
// pokedex-web/server/pokedexData.js's cargar_datos_json().
export const pokedex = pokedexJson as unknown as Pokedex;

export const pokedexOrder: string[] = Object.keys(pokedex).sort(
  (a, b) => parseInt(a, 10) - parseInt(b, 10)
);

export function getPokemon(number: string) {
  return pokedex[number];
}

export const typesList: string[] = (() => {
  const types = new Set<string>();
  for (const p of Object.values(pokedex)) {
    types.add(p.type1);
    if (p.type2) types.add(p.type2);
  }
  return ["All Types", ...types];
})();

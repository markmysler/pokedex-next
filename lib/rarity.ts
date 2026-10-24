import type { OwnedPokemon } from "@/types/pokemon";
import { getPokemon, pokedexOrder } from "./pokedex";
import { isShinyInstance } from "./shiny";

// Display-only rarity grades (redesign wave v9). The game itself has no
// rarity: rollLootboxInstance() picks a species uniformly. A grade is just a
// label derived from the species' base-stat total, so a strong pull reads as
// strong at a glance (card band colour, case-reel colour, sort order). It
// never feeds back into rolling, battling or anything stored.
export const GRADES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Grade = (typeof GRADES)[number];
// Shiny overrides the grade wherever an *instance* is shown -- it's a
// per-roll property (lib/shiny.ts), not a species one.
export type Rarity = Grade | "shiny";

// Lower bounds of each grade above common, by species base-stat total.
// Chosen so the 7 strongest species (Mewtwo, Mew, Tyranitar, Dragonite and
// the three birds) are legendary, and every other band holds roughly a
// fifth to a third of the roster.
export const GRADE_CUTOFFS: Record<Exclude<Grade, "common">, number> = {
  uncommon: 330,
  rare: 450,
  epic: 500,
  legendary: 580,
};

export function gradeForTotal(baseTotal: number): Grade {
  if (baseTotal >= GRADE_CUTOFFS.legendary) return "legendary";
  if (baseTotal >= GRADE_CUTOFFS.epic) return "epic";
  if (baseTotal >= GRADE_CUTOFFS.rare) return "rare";
  if (baseTotal >= GRADE_CUTOFFS.uncommon) return "uncommon";
  return "common";
}

export function speciesGrade(number: string): Grade {
  const species = getPokemon(number);
  return species ? gradeForTotal(species.total) : "common";
}

export function instanceRarity(pokemon: OwnedPokemon): Rarity {
  return isShinyInstance(pokemon) ? "shiny" : speciesGrade(pokemon.number);
}

// Higher is rarer -- for "sort by grade" and picking a batch's best pull.
export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  shiny: 5,
};

// Roughly how often an opened lootbox is shiny. lib/shiny.ts's threshold is
// tuned to ~10% (see its comment); this is only used for the case screen's
// "what's inside" odds and for cosmetic reel filler, never for a real roll.
export const SHINY_RATE = 0.1;

// Share of drops per grade: species are rolled uniformly, so it's simply
// the share of the roster in each grade.
export function gradeOdds(): Record<Grade, number> {
  const counts: Record<Grade, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  for (const number of pokedexOrder) counts[speciesGrade(number)]++;
  const total = pokedexOrder.length || 1;
  return Object.fromEntries(GRADES.map((g) => [g, counts[g] / total])) as Record<Grade, number>;
}

export interface ReelFiller {
  number: string;
  shiny: boolean;
}

// One decorative card for the case-opening reel. Picks a species the same
// way the server does (uniformly), so the strip's colours match real odds
// and never fake a near-miss. The real result always comes from the open
// endpoint; this only fills the cards around it.
export function rollReelFiller(random: () => number = Math.random): ReelFiller {
  const number = pokedexOrder[Math.floor(random() * pokedexOrder.length)];
  return { number, shiny: random() < SHINY_RATE };
}

import pokedexJson from "./pokedex.json";
import type { BuffMove, DebuffMove, DrainMove, Move, Pokedex, PokemonType, RedirectMove } from "@/types/pokemon";

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

function groupByType<T extends { type: PokemonType }>(moves: T[]): Partial<Record<PokemonType, T[]>> {
  const grouped: Partial<Record<PokemonType, T[]>> = {};
  for (const move of moves) (grouped[move.type] ??= []).push(move);
  return grouped;
}

export const movesByType: Partial<Record<PokemonType, Move[]>> = groupByType(allMoves);

// --- Buff/debuff/drain/redirect pools (upgrades/22-buff-debuff-drain-
// redirect-move-pool.md) -- authored directly here, not harvested from
// pokedex.json (which has no data for these kinds). Sized and tiered to
// mirror the damage pool's own density/conventions rather than one move per
// type: a modest, mostly-generic set per kind, most flavored to a type
// where the flavor is obvious, a few tagged "Normal" as a fallback so every
// Pokemon's 85%-own-type roll always has *something* to draw from even for
// types with no obvious flavor match (step 23 wires the actual rolling).

export const buffMoves: BuffMove[] = [
  { name: "Meditate", type: "Psychic", mana_cost: 10, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.15, turns: 2 } },
  { name: "Bulk Up", type: "Fighting", mana_cost: 20, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.3, turns: 3 } },
  { name: "Swords Dance", type: "Normal", mana_cost: 30, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.5, turns: 3 } },
  { name: "Harden", type: "Normal", mana_cost: 10, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.15, turns: 2 } },
  { name: "Iron Defense", type: "Steel", mana_cost: 20, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.3, turns: 3 } },
  { name: "Cotton Guard", type: "Grass", mana_cost: 30, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.5, turns: 3 } },
  { name: "Recover", type: "Normal", mana_cost: 20, kind: "buff", buff: { effect: "heal", percentOfMaxHp: 25 } },
  { name: "Moonlight", type: "Fairy", mana_cost: 35, kind: "buff", buff: { effect: "heal", percentOfMaxHp: 40 } },
  { name: "Charge", type: "Electric", mana_cost: 5, kind: "buff", buff: { effect: "restoreMana", amount: 30 } },
  { name: "Barrier", type: "Psychic", mana_cost: 22, kind: "buff", buff: { effect: "shield", amount: 60 } },
  { name: "Refresh", type: "Normal", mana_cost: 15, kind: "buff", buff: { effect: "cleanse" } },
];
export const buffMovesByType = groupByType(buffMoves);

export const debuffMoves: DebuffMove[] = [
  { name: "Growl", type: "Normal", mana_cost: 10, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.85, turns: 2 } },
  { name: "Screech", type: "Dark", mana_cost: 20, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.7, turns: 3 } },
  { name: "Demoralize", type: "Ghost", mana_cost: 30, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.5, turns: 3 } },
  { name: "Leer", type: "Normal", mana_cost: 10, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.85, turns: 2 } },
  { name: "Acid Spray", type: "Poison", mana_cost: 20, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.7, turns: 3 } },
  { name: "Metal Sound", type: "Steel", mana_cost: 30, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.5, turns: 3 } },
  { name: "Mana Burn", type: "Electric", mana_cost: 8, kind: "debuff", debuff: { effect: "drainMana", amount: 25 } },
  { name: "Mind Sap", type: "Psychic", mana_cost: 10, kind: "debuff", debuff: { effect: "drainMana", amount: 30 } },
  { name: "Shield Breaker", type: "Fighting", mana_cost: 10, kind: "debuff", debuff: { effect: "removeShield" } },
  // inflictStatus reuses the exact type-to-status mapping steps 10/19
  // already established for damage moves' incidental (chance-based) rolls
  // -- these are the guaranteed version, priced higher accordingly.
  { name: "Toxic Spike", type: "Poison", mana_cost: 28, kind: "debuff", debuff: { effect: "inflictStatus", status: "poison" } },
  { name: "Inferno Curse", type: "Fire", mana_cost: 28, kind: "debuff", debuff: { effect: "inflictStatus", status: "burn" } },
  { name: "Absolute Zero", type: "Ice", mana_cost: 28, kind: "debuff", debuff: { effect: "inflictStatus", status: "freeze" } },
];
export const debuffMovesByType = groupByType(debuffMoves);

export const drainMoves: DrainMove[] = [
  { name: "Drain Punch", type: "Fighting", category: "Physical", power: 35, mana_cost: 10, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 45 } },
  { name: "Bug Bite", type: "Bug", category: "Physical", power: 35, mana_cost: 10, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 40 } },
  { name: "Life Steal", type: "Normal", category: "Physical", power: 35, mana_cost: 10, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 40 } },
  { name: "Giga Drain", type: "Grass", category: "Special", power: 55, mana_cost: 20, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 50 } },
  { name: "Vampire Fang", type: "Dark", category: "Physical", power: 60, mana_cost: 20, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 45 } },
  { name: "Mind Siphon", type: "Psychic", category: "Special", power: 55, mana_cost: 20, kind: "drain", drain: { resource: "mp", percentOfDamageDealt: 40 } },
  { name: "Dream Eater", type: "Ghost", category: "Special", power: 90, mana_cost: 35, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 50 } },
  { name: "Energy Drain", type: "Electric", category: "Special", power: 85, mana_cost: 30, kind: "drain", drain: { resource: "mp", percentOfDamageDealt: 45 } },
];
export const drainMovesByType = groupByType(drainMoves);

export const redirectMoves: RedirectMove[] = [
  { name: "Taunt", type: "Dark", mana_cost: 25, kind: "redirect", turns: 2 },
  { name: "Confuse Ray", type: "Ghost", mana_cost: 30, kind: "redirect", turns: 3 },
  { name: "Provoke", type: "Fighting", mana_cost: 25, kind: "redirect", turns: 2 },
  { name: "Disorient", type: "Normal", mana_cost: 25, kind: "redirect", turns: 2 },
];
export const redirectMovesByType = groupByType(redirectMoves);

// Combined "support" pool (upgrades/23-guaranteed-move-slot-rolling.md) --
// the 4 new kinds pooled together, drawn from as a single unit for a
// rolled instance's 2 support slots (as opposed to a forced one-of-each
// guarantee). Union of the 4 per-type maps the same way the flat array is
// a union of the 4 flat arrays.
export const supportMoves: Move[] = [...buffMoves, ...debuffMoves, ...drainMoves, ...redirectMoves];
export const supportMovesByType: Partial<Record<PokemonType, Move[]>> = groupByType(supportMoves);

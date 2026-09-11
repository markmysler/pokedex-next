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

// max_uses values below follow upgrades/40-uses-based-move-data-model.md's
// mana_cost -> max_uses tier table (5-10 -> 5, 15-20 -> 4, 22-25 -> 3,
// 28-30 -> 2, 35-45 -> 1), applied to each move's old mana_cost.
export const buffMoves: BuffMove[] = [
  { name: "Meditate", type: "Psychic", max_uses: 5, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.15, turns: 2 } },
  { name: "Bulk Up", type: "Fighting", max_uses: 4, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.3, turns: 3 } },
  { name: "Swords Dance", type: "Normal", max_uses: 2, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.5, turns: 3 } },
  { name: "Harden", type: "Normal", max_uses: 5, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.15, turns: 2 } },
  { name: "Iron Defense", type: "Steel", max_uses: 4, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.3, turns: 3 } },
  { name: "Cotton Guard", type: "Grass", max_uses: 2, kind: "buff", buff: { effect: "statUp", stat: "def", multiplier: 1.5, turns: 3 } },
  { name: "Recover", type: "Normal", max_uses: 4, kind: "buff", buff: { effect: "heal", percentOfMaxHp: 25 } },
  { name: "Moonlight", type: "Fairy", max_uses: 1, kind: "buff", buff: { effect: "heal", percentOfMaxHp: 40 } },
  // Reassigned from "restoreMana" (upgrades/40-uses-based-move-data-model.md
  // -- the mp pool it restored no longer exists; a modest atk buff keeps
  // Charge's "power up" flavor without a uses-based analog to restoreMana).
  { name: "Charge", type: "Electric", max_uses: 5, kind: "buff", buff: { effect: "statUp", stat: "atk", multiplier: 1.2, turns: 2 } },
  { name: "Barrier", type: "Psychic", max_uses: 3, kind: "buff", buff: { effect: "shield", amount: 60 } },
  { name: "Refresh", type: "Normal", max_uses: 4, kind: "buff", buff: { effect: "cleanse" } },
];
export const buffMovesByType = groupByType(buffMoves);

export const debuffMoves: DebuffMove[] = [
  { name: "Growl", type: "Normal", max_uses: 5, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.85, turns: 2 } },
  { name: "Screech", type: "Dark", max_uses: 4, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.7, turns: 3 } },
  { name: "Demoralize", type: "Ghost", max_uses: 2, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.5, turns: 3 } },
  { name: "Leer", type: "Normal", max_uses: 5, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.85, turns: 2 } },
  { name: "Acid Spray", type: "Poison", max_uses: 4, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.7, turns: 3 } },
  { name: "Metal Sound", type: "Steel", max_uses: 2, kind: "debuff", debuff: { effect: "statDown", stat: "def", multiplier: 0.5, turns: 3 } },
  // Reassigned from "drainMana" (upgrades/40-uses-based-move-data-model.md
  // -- the mp pool it drained no longer exists). Mana Burn keeps an
  // Electric-flavored atk-down; Mind Sap becomes a guaranteed blind
  // ("sap the mind" -> disorientation), reusing the existing inflictStatus
  // shape rather than inventing a new one.
  { name: "Mana Burn", type: "Electric", max_uses: 5, kind: "debuff", debuff: { effect: "statDown", stat: "atk", multiplier: 0.85, turns: 2 } },
  { name: "Mind Sap", type: "Psychic", max_uses: 5, kind: "debuff", debuff: { effect: "inflictStatus", status: "blind" } },
  { name: "Shield Breaker", type: "Fighting", max_uses: 5, kind: "debuff", debuff: { effect: "removeShield" } },
  // inflictStatus reuses the exact type-to-status mapping steps 10/19
  // already established for damage moves' incidental (chance-based) rolls
  // -- these are the guaranteed version, priced higher accordingly.
  { name: "Toxic Spike", type: "Poison", max_uses: 2, kind: "debuff", debuff: { effect: "inflictStatus", status: "poison" } },
  { name: "Inferno Curse", type: "Fire", max_uses: 2, kind: "debuff", debuff: { effect: "inflictStatus", status: "burn" } },
  { name: "Absolute Zero", type: "Ice", max_uses: 2, kind: "debuff", debuff: { effect: "inflictStatus", status: "freeze" } },
];
export const debuffMovesByType = groupByType(debuffMoves);

export const drainMoves: DrainMove[] = [
  { name: "Drain Punch", type: "Fighting", category: "Physical", power: 35, max_uses: 5, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 45 } },
  { name: "Bug Bite", type: "Bug", category: "Physical", power: 35, max_uses: 5, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 40 } },
  { name: "Life Steal", type: "Normal", category: "Physical", power: 35, max_uses: 5, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 40 } },
  { name: "Giga Drain", type: "Grass", category: "Special", power: 55, max_uses: 4, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 50 } },
  { name: "Vampire Fang", type: "Dark", category: "Physical", power: 60, max_uses: 4, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 45 } },
  // resource reassigned from "mp" to "hp" (upgrades/40-uses-based-move-
  // data-model.md -- the mp pool it restored no longer exists); same
  // percentOfDamageDealt either way, just healing HP now like every other
  // drain move.
  { name: "Mind Siphon", type: "Psychic", category: "Special", power: 55, max_uses: 4, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 40 } },
  { name: "Dream Eater", type: "Ghost", category: "Special", power: 90, max_uses: 1, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 50 } },
  { name: "Energy Drain", type: "Electric", category: "Special", power: 85, max_uses: 2, kind: "drain", drain: { resource: "hp", percentOfDamageDealt: 45 } },
];
export const drainMovesByType = groupByType(drainMoves);

export const redirectMoves: RedirectMove[] = [
  { name: "Taunt", type: "Dark", max_uses: 3, kind: "redirect", turns: 2 },
  { name: "Confuse Ray", type: "Ghost", max_uses: 2, kind: "redirect", turns: 3 },
  { name: "Provoke", type: "Fighting", max_uses: 3, kind: "redirect", turns: 2 },
  { name: "Disorient", type: "Normal", max_uses: 3, kind: "redirect", turns: 2 },
];
export const redirectMovesByType = groupByType(redirectMoves);

// Combined "support" pool (upgrades/23-guaranteed-move-slot-rolling.md) --
// the 4 new kinds pooled together, drawn from as a single unit for a
// rolled instance's 2 support slots (as opposed to a forced one-of-each
// guarantee). Union of the 4 per-type maps the same way the flat array is
// a union of the 4 flat arrays.
export const supportMoves: Move[] = [...buffMoves, ...debuffMoves, ...drainMoves, ...redirectMoves];
export const supportMovesByType: Partial<Record<PokemonType, Move[]>> = groupByType(supportMoves);

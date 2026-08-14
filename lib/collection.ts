import type { Move, OwnedPokemon, Pokemon, PokemonType, RolledStats } from "@/types/pokemon";
import { allMoves, movesByType, supportMoves, supportMovesByType } from "./data/movePool";
import { getPokemon, pokedexOrder } from "./pokedex";

// Box-Muller transform — standard normal (mean 0, stddev 1).
function randNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Mostly close to `center` (narrow spread), with rare wide outliers from the
// normal distribution's tails — this is the one place both lootbox rolling
// (lib/collection.ts) and bot leveling (added in step 3) share their "luck"
// shape, just aimed at different centers. Exported so lib/shiny.ts can
// reuse the exact same spread when modeling this same roll distribution,
// instead of duplicating the number (upgrades/03-shiny-pokemon.md).
export const STAT_SPREAD_RATIO = 0.12;
const STAT_FLOOR_RATIO = 0.5;

export function rollStatAround(center: number): number {
  const spread = center * STAT_SPREAD_RATIO;
  const rolled = center + randNormal() * spread;
  return Math.max(1, Math.round(Math.max(center * STAT_FLOOR_RATIO, rolled)));
}

// Each of the 6 stats is rolled independently around the species' own base
// stat — an instance can be freakishly strong in one stat and weak in
// another (see upgrades/main.md's "stat rolling" decision).
export function rollStats(pokemon: Pick<Pokemon, "hp" | "atk" | "def" | "spatk" | "spdef" | "spd">) {
  return {
    hp: rollStatAround(pokemon.hp),
    atk: rollStatAround(pokemon.atk),
    def: rollStatAround(pokemon.def),
    spatk: rollStatAround(pokemon.spatk),
    spdef: rollStatAround(pokemon.spdef),
    spd: rollStatAround(pokemon.spd),
  };
}

// Exported for the same reason as STAT_SPREAD_RATIO above — lib/shiny.ts
// models this exact same pool mixture when scoring a rolled moveset.
export const SAME_TYPE_CHANCE = 0.85;
export const MOVE_SLOTS = 4;
// Guaranteed 2-damage + 2-support split (upgrades/23-guaranteed-move-slot
// -rolling.md) -- deliberately *not* one-forced-buff + one-forced-debuff
// etc., just "2 of the other kinds," each of the 2 support slots drawn
// independently from the combined buff/debuff/drain/redirect pool.
const DAMAGE_SLOTS = 2;
const SUPPORT_SLOTS = 4 - DAMAGE_SLOTS;
const MAX_ROLL_ATTEMPTS = 200;

// Draws one move from `pool` (85%-own-type/15%-any-type weighting, same as
// before), retrying against a name already in `excludeNames` up to
// MAX_ROLL_ATTEMPTS times. Shared by rollMoveset()'s damage and support
// passes so both get identical own-type-weighted sampling behavior.
function rollOneMove(
  pool: Move[],
  poolByType: Partial<Record<PokemonType, Move[]>>,
  ownTypes: PokemonType[],
  excludeNames: Set<string>
): Move | undefined {
  const ownTypePool = ownTypes.flatMap((t) => poolByType[t] ?? []);

  for (let attempts = 0; attempts < MAX_ROLL_ATTEMPTS; attempts++) {
    const useOwnType = ownTypePool.length > 0 && Math.random() < SAME_TYPE_CHANCE;
    const candidates = useOwnType ? ownTypePool : pool;
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    if (!excludeNames.has(candidate.name)) return candidate;
  }
  return undefined;
}

// 2 slots from the damage pool + 2 from the combined support pool (buff/
// debuff/drain/redirect), each slot independently 85%-own-type-weighted.
// Name-dedup is global across all 4 slots, not per-pool -- a Pokemon
// shouldn't roll the same move name twice even across pools (defensive;
// the pools are disjoint by kind so this shouldn't trigger in practice).
export function rollMoveset(pokemon: Pick<Pokemon, "type1" | "type2">): Move[] {
  const ownTypes: PokemonType[] = [pokemon.type1, pokemon.type2].filter((t): t is PokemonType => Boolean(t));
  const picked: Move[] = [];
  const pickedNames = new Set<string>();

  for (let i = 0; i < DAMAGE_SLOTS; i++) {
    const move = rollOneMove(allMoves, movesByType, ownTypes, pickedNames);
    if (!move) break;
    picked.push(move);
    pickedNames.add(move.name);
  }
  for (let i = 0; i < SUPPORT_SLOTS; i++) {
    const move = rollOneMove(supportMoves, supportMovesByType, ownTypes, pickedNames);
    if (!move) break;
    picked.push(move);
    pickedNames.add(move.name);
  }

  return picked;
}

// Rolls a brand-new lootbox-acquired instance for `pokemon` — stats centered
// on its own base stats. Step 3's bot generation reuses rollStatAround()
// directly with a different center (the player's level) rather than this
// function, since a bot's stats aren't centered on its own species.
export function rollInstance(pokemon: Pokemon): RolledStats {
  const stats = rollStats(pokemon);
  const total = stats.hp + stats.atk + stats.def + stats.spatk + stats.spdef + stats.spd;
  return { ...stats, total, moves: rollMoveset(pokemon) };
}

// Generates an ephemeral bot opponent: species is random (never chosen by
// the player), but its stats are re-centered on `playerLevel` (the average
// `total` of the team the player brought into this fight) instead of the
// species' own base stats — this is what reconciles "randomized species"
// with "adjusted to the user's level" (see upgrades/03-bot-battle-rework.md).
// Never persisted to pokemon_instances — `id` is a placeholder, not a real
// row, since bots aren't owned by anyone.
export function rollBotOpponent(species: Pokemon, playerLevel: number): OwnedPokemon {
  const scale = species.total > 0 ? playerLevel / species.total : 1;
  const stats = {
    hp: rollStatAround(species.hp * scale),
    atk: rollStatAround(species.atk * scale),
    def: rollStatAround(species.def * scale),
    spatk: rollStatAround(species.spatk * scale),
    spdef: rollStatAround(species.spdef * scale),
    spd: rollStatAround(species.spd * scale),
  };
  const total = stats.hp + stats.atk + stats.def + stats.spatk + stats.spdef + stats.spd;

  return {
    id: `bot-${species.number}-${Math.random().toString(36).slice(2)}`,
    number: species.number,
    name: species.name,
    type1: species.type1,
    type2: species.type2,
    ...stats,
    total,
    moves: rollMoveset(species),
    isStarter: false,
    nickname: null,
  };
}

// Bot 3v3 battles (upgrades/01-bot-3v3.md) reuse rollBotOpponent() three
// times, once per bot — each an independently random species, all leveled
// to the same team-average total the player's picked team rolled in at.
// No new leveling math: same rollBotOpponent() 1v1 bot battles always used.
export function rollBotTeam(playerTeamAverageTotal: number): OwnedPokemon[] {
  return Array.from({ length: 3 }, () => {
    const number = pokedexOrder[Math.floor(Math.random() * pokedexOrder.length)];
    return rollBotOpponent(getPokemon(number), playerTeamAverageTotal);
  });
}

interface PokemonInstanceRow {
  id: string;
  pokemon_number: string;
  hp: number;
  atk: number;
  def: number;
  spatk: number;
  spdef: number;
  spd: number;
  total: number;
  moves: unknown;
  is_starter: boolean;
  nickname: string | null;
}

// Joins a pokemon_instances DB row with its species' static display fields
// (name/type1/type2 never change per-instance, only stats/moves do).
export function toOwnedPokemon(row: PokemonInstanceRow, species: Pick<Pokemon, "number" | "name" | "type1" | "type2">): OwnedPokemon {
  return {
    id: row.id,
    number: species.number,
    name: species.name,
    type1: species.type1,
    type2: species.type2,
    hp: row.hp,
    atk: row.atk,
    def: row.def,
    spatk: row.spatk,
    spdef: row.spdef,
    spd: row.spd,
    total: row.total,
    moves: row.moves as Move[],
    isStarter: row.is_starter,
    nickname: row.nickname,
  };
}

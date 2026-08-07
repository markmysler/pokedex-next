import type { Move, OwnedPokemon, Pokemon, PokemonType, RolledStats } from "@/types/pokemon";
import { allMoves, movesByType } from "./data/movePool";

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
// shape, just aimed at different centers.
const STAT_SPREAD_RATIO = 0.12;
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

const SAME_TYPE_CHANCE = 0.85;
const MOVE_SLOTS = 4;
const MAX_ROLL_ATTEMPTS = 200;

// ~85% of a rolled Pokemon's moves match one of its own type(s); ~15% can be
// any type (the "rare cases" from the request). Draws without replacement —
// a moveset with the same move in two slots would look like a bug.
export function rollMoveset(pokemon: Pick<Pokemon, "type1" | "type2">): Move[] {
  const ownTypes: PokemonType[] = [pokemon.type1, pokemon.type2].filter((t): t is PokemonType => Boolean(t));
  const ownTypePool = ownTypes.flatMap((t) => movesByType[t] ?? []);

  const picked: Move[] = [];
  const pickedNames = new Set<string>();
  let attempts = 0;

  while (picked.length < MOVE_SLOTS && attempts < MAX_ROLL_ATTEMPTS) {
    attempts++;
    const useOwnType = ownTypePool.length > 0 && Math.random() < SAME_TYPE_CHANCE;
    const pool = useOwnType ? ownTypePool : allMoves;
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (pickedNames.has(candidate.name)) continue;
    pickedNames.add(candidate.name);
    picked.push(candidate);
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
  };
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
  };
}

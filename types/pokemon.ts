export type PokemonType =
  | "Normal" | "Fire" | "Water" | "Grass" | "Electric" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Dark" | "Steel" | "Fairy";

export type MoveCategory = "Physical" | "Special";

export interface Move {
  name: string;
  type: PokemonType;
  power: number;
  category: MoveCategory;
  mana_cost: number;
}

export interface Pokemon {
  number: string;
  name: string;
  type1: PokemonType;
  type2: PokemonType | null;
  hp: number;
  atk: number;
  def: number;
  spatk: number;
  spdef: number;
  spd: number;
  total: number;
  moves: Move[];
}

export type Pokedex = Record<string, Pokemon>;

export interface UserPokedexEntry {
  acquired: boolean;
  notes: string;
}

export type UserPokedexData = Record<string, UserPokedexEntry>;

// The rolled result of opening a lootbox (or a starter grant) — the same
// shape whether it came from lib/collection.ts's rollInstance() or a fixed
// starter roster, since both ultimately become a pokemon_instances row.
export interface RolledStats {
  hp: number;
  atk: number;
  def: number;
  spatk: number;
  spdef: number;
  spd: number;
  total: number;
  moves: Move[];
}

// A specific Pokemon an account owns: species display fields (looked up by
// pokemon_number from the static Pokedex) + this instance's own rolled
// stats/moves. Two instances of the same species can have completely
// different stats — that's the point (see upgrades/02-collection-system.md).
export interface OwnedPokemon extends RolledStats {
  id: string;
  number: string;
  name: string;
  type1: PokemonType;
  type2: PokemonType | null;
  isStarter: boolean;
}

export interface Lootbox {
  id: string;
  openedAt: string | null;
  createdAt: string;
}

export interface FighterState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  pokemon: Pokemon;
}

export type RoomSlot = 1 | 2;

// A player's move during a normal (non-forced-switch) turn: either an
// attack from the active member's moveset, or a voluntary switch to a
// benched member — switching costs the whole turn, same as attacking.
export interface AttackAction {
  type: "attack";
  moveIndex: number;
}

export interface SwitchAction {
  type: "switch";
  teamIndex: 0 | 1 | 2;
}

export type BattleAction = AttackAction | SwitchAction;

// Three owned Pokemon per side (see upgrades/05-3v3-battles.md). Members
// keep their HP/MP across switches — switching out doesn't heal or reset.
export interface TeamState {
  members: [FighterState, FighterState, FighterState];
  activeIndex: 0 | 1 | 2;
}

export type RoomStatus = "waiting_for_players" | "picking" | "battling" | "over";

export interface RoomState {
  team1: TeamState;
  team2: TeamState;
  pending: Partial<Record<RoomSlot, BattleAction>>;
  // Set to the slot that must submit a switch (and only a switch) before
  // anyone can act again — set when an attack faints a team's active member
  // but the team isn't fully wiped yet. Null the rest of the time.
  awaitingForcedSwitch: RoomSlot | null;
  turnCount: number;
  over: boolean;
  winner: RoomSlot | null;
  // Set once a player requests a rematch (only meaningful once status is
  // "over"); cleared when the room resets back to "picking" — either by an
  // accept or by finishing a fresh battle (see upgrades/06-rematch.md).
  rematchRequestedBy?: RoomSlot | null;
}

export interface BattleRoom {
  code: string;
  player1_id: string;
  player2_id: string | null;
  status: RoomStatus;
  state: RoomState | Record<string, never>;
  created_at: string;
}

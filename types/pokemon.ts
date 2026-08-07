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

export interface FighterState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  pokemon: Pokemon;
}

export type RoomSlot = 1 | 2;

export interface RoomState {
  fighter1: FighterState;
  fighter2: FighterState;
  pending: Partial<Record<RoomSlot, Move>>;
  turnCount: number;
  over: boolean;
  winner: RoomSlot | null;
}

export interface BattleRoom {
  code: string;
  player1_id: string;
  player1_fighter: string;
  player2_id: string | null;
  player2_fighter: string | null;
  status: "waiting" | "battling" | "over";
  state: RoomState | Record<string, never>;
  created_at: string;
}

export type PokemonType =
  | "Normal" | "Fire" | "Water" | "Grass" | "Electric" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Dark" | "Steel" | "Fairy";

export type MoveCategory = "Physical" | "Special";

// Move kinds (upgrades/21-move-kind-data-model.md) — a discriminated union
// instead of one flat shape, since power/category only make sense for
// "damage" and every other kind carries its own effect payload instead.
export type MoveKind = "damage" | "buff" | "debuff" | "drain" | "redirect";
// Which stats a buff/debuff modifier scales: "atk" scales atk+spatk
// together, "def" scales def+spdef together (see upgrades/main.md's key
// decision) -- meaningful regardless of whether the affected Pokemon's
// remaining moves are Physical- or Special-category.
export type StatModKey = "atk" | "def";

interface BaseMove {
  name: string;
  type: PokemonType;
  mana_cost: number;
  kind: MoveKind;
}

export interface DamageMove extends BaseMove {
  kind: "damage";
  category: MoveCategory;
  power: number;
}

export type BuffEffect =
  | { effect: "statUp"; stat: StatModKey; multiplier: number; turns: number }
  | { effect: "heal"; percentOfMaxHp: number } // instant, not a turn-counter
  | { effect: "restoreMana"; amount: number } // instant
  | { effect: "shield"; amount: number } // adds to shieldPoints, no duration
  | { effect: "cleanse" }; // clears bleed/blind/poison/burn/freeze turns

export interface BuffMove extends BaseMove {
  kind: "buff";
  buff: BuffEffect;
}

export type DebuffEffect =
  | { effect: "statDown"; stat: StatModKey; multiplier: number; turns: number }
  | { effect: "drainMana"; amount: number } // instant, subtracts from target's mp
  | { effect: "removeShield" } // instant, zeroes target's shieldPoints
  | { effect: "inflictStatus"; status: "bleed" | "blind" | "poison" | "burn" | "freeze" }; // guaranteed, bypasses the normal chance roll

export interface DebuffMove extends BaseMove {
  kind: "debuff";
  debuff: DebuffEffect;
}

export interface DrainMove extends BaseMove {
  kind: "drain";
  category: MoveCategory; // still deals damage using the existing formula
  power: number;
  drain: { resource: "hp" | "mp"; percentOfDamageDealt: number }; // e.g. 50 = heal/restore 50% of the damage this hit dealt
}

export interface RedirectMove extends BaseMove {
  kind: "redirect";
  turns: number; // how many of the target's own future attacks get redirected
}

// Every move an instance can roll is exactly one of these kinds -- see
// upgrades/21-move-kind-data-model.md. Code that only knows how to run a
// DamageMove must narrow on `kind` before reading power/category/etc.
export type Move = DamageMove | BuffMove | DebuffMove | DrainMove | RedirectMove;

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
  // Owner-set name for this specific instance (upgrades/08-pokemon-nicknames.md).
  // null means "no nickname" -- see lib/pokemonDisplay.ts's displayName().
  nickname: string | null;
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
  // Always an actually-owned instance at runtime (buildFighterState() is
  // only ever called with OwnedPokemon — see BattleArena/OnlineBattle/
  // lock-in), never a bare species lookup — typed as such so shiny status
  // (upgrades/03-shiny-pokemon.md) can be read directly off it.
  pokemon: OwnedPokemon;
  // Status-effect layer (upgrades/10-battle-depth.md) — pure per-battle
  // state, never persisted beyond a battle, reset every battle exactly like
  // hp/mp. Turn counters, not booleans: 0 means "not affected," refreshed
  // (not stacked) back to a fixed duration on re-inflict. Only ticks/decays
  // while this fighter is the *active* member of its team; a benched
  // Pokemon keeps its counters frozen until swapped back in.
  bleedTurns: number;
  blindTurns: number;
  poisonTurns: number;
  // Burn/Freeze (upgrades/19-burn-and-freeze-status-effects.md) — same
  // turn-counter shape as the three above, just two more kinds.
  burnTurns: number;
  freezeTurns: number;

  // Buff/debuff stat modifiers (upgrades/24-battle-engine-buffs-and-debuffs.md)
  // -- one signed pair per stat, shared by buffs (multiplier > 1) and
  // debuffs (multiplier < 1). Defaults: 1 / 0 (no effect). atkMod scales
  // atk+spatk together; defMod scales def+spdef together.
  atkMod: number;
  atkModTurns: number;
  defMod: number;
  defModTurns: number;

  // Shield (upgrades/24-battle-engine-buffs-and-debuffs.md) -- flat absorb
  // pool, consumed by incoming damage before HP is touched. No duration; it
  // just runs out or doesn't.
  shieldPoints: number;

  // Redirect (upgrades/26-battle-engine-redirect-self.md,
  // 27-battle-engine-redirect-allies.md) -- while > 0, this fighter's own
  // attacks resolve against a target chosen from *their own* side instead
  // of the opponent's, decided engine-side (never a player choice).
  redirectTurns: number;
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

import type { BattleAction, FighterState, RoomSlot, TeamState, Move, PokemonType } from "@/types/pokemon";
import { getTypeMultiplier } from "./typeData";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function effectivenessText(mult: number): string {
  if (mult >= 2.0) return "⚡ SUPER EFFECTIVE! (2.0x)";
  if (mult === 0.0) return "🛡️ NO EFFECT (0.0x)";
  if (mult < 1.0) return "🛡️ Not very effective... (0.5x)";
  return "💥 Normal Hit (1.0x)";
}

// --- Status effects (upgrades/10-battle-depth.md) --------------------------
// Additive layer on top of the existing damage formula, which is unchanged
// for a non-dodged, non-blinded hit. Defaults to tune once played, same
// framing as step 3's shiny threshold — reasonable starting points, not a
// spec to hit exactly.

const DODGE_CAP = 0.35;
const STATUS_INFLICT_CAP = 0.3;
const STATUS_DURATION = 3;
const BLEED_TICK_RATIO = 0.05;
const POISON_TICK_RATIO = 0.05;
const BLIND_MISS_CHANCE = 0.25;
// Burn/Freeze (upgrades/19-burn-and-freeze-status-effects.md) — burn is a
// damage tick like bleed/poison, doubled against a Grass-type target
// ("extra effect", mirroring a super-effective hit but on the status's own
// damage rather than the move's). Freeze isn't a tick at all: while active
// it knocks 30% off the frozen fighter's own atk/def/spd, checked wherever
// those stats get read (executeMove's atkStat/defStat, and the speed roll
// that decides turn order).
const BURN_TICK_RATIO = 0.05;
const BURN_TICK_RATIO_VS_GRASS = 0.1;
const FREEZE_STAT_MULT = 0.7;

export type StatusKind = "bleed" | "blind" | "poison" | "burn" | "freeze";

function hasType(pokemon: { type1: PokemonType; type2: PokemonType | null }, type: PokemonType): boolean {
  return pokemon.type1 === type || pokemon.type2 === type;
}

// Applied at the point atk/def/spd are actually read, not stored back onto
// the Pokemon's base stats — a frozen fighter's own numbers are unchanged,
// only what battleEngine derives from them this instant.
function freezeAdjusted(stat: number, state: FighterState): number {
  return state.freezeTurns > 0 ? stat * FREEZE_STAT_MULT : stat;
}

function rollDodgeChance(attackerSpd: number, defenderSpd: number): number {
  return clamp((defenderSpd - attackerSpd) / (attackerSpd + defenderSpd + 100), 0, DODGE_CAP);
}

// Same atk-vs-def comparison already used for damage — a high defensive
// stat already lowers the opposing chance, no separate resist formula
// needed (upgrades/10-battle-depth.md's "stat dual roles").
function rollInflictChance(atkStat: number, defStat: number): number {
  return clamp((atkStat - defStat) / (atkStat + defStat), 0, STATUS_INFLICT_CAP);
}

// Applied at the start of the *active* member's turn — never to a benched
// Pokemon, which keeps its counters frozen until swapped back in. Mutates
// `state` in place; returns the tick's log lines (empty if not afflicted).
function applyStatusTick(state: FighterState): string[] {
  const log: string[] = [];
  if (state.hp <= 0) return log;

  if (state.bleedTurns > 0) {
    const dmg = Math.max(1, Math.round(state.maxHp * BLEED_TICK_RATIO));
    state.hp = Math.max(0, state.hp - dmg);
    state.bleedTurns -= 1;
    const remaining = state.bleedTurns > 0 ? ` (${state.bleedTurns} turn${state.bleedTurns === 1 ? "" : "s"} left)` : " — bleeding wore off.";
    log.push(`  -> 🩸 ${state.pokemon.name} takes ${dmg} bleed damage!${remaining}`);
  }
  if (state.hp > 0 && state.poisonTurns > 0) {
    const dmg = Math.max(1, Math.round(state.maxHp * POISON_TICK_RATIO));
    state.hp = Math.max(0, state.hp - dmg);
    state.poisonTurns -= 1;
    const remaining = state.poisonTurns > 0 ? ` (${state.poisonTurns} turn${state.poisonTurns === 1 ? "" : "s"} left)` : " — poison wore off.";
    log.push(`  -> ☠️ ${state.pokemon.name} takes ${dmg} poison damage!${remaining}`);
  }
  if (state.hp > 0 && state.burnTurns > 0) {
    const ratio = hasType(state.pokemon, "Grass") ? BURN_TICK_RATIO_VS_GRASS : BURN_TICK_RATIO;
    const dmg = Math.max(1, Math.round(state.maxHp * ratio));
    state.hp = Math.max(0, state.hp - dmg);
    state.burnTurns -= 1;
    const remaining = state.burnTurns > 0 ? ` (${state.burnTurns} turn${state.burnTurns === 1 ? "" : "s"} left)` : " — the burn wore off.";
    log.push(`  -> 🔥 ${state.pokemon.name} takes ${dmg} burn damage!${remaining}`);
  }
  if (state.hp > 0 && state.freezeTurns > 0) {
    state.freezeTurns -= 1;
    const remaining = state.freezeTurns > 0 ? ` (${state.freezeTurns} turn${state.freezeTurns === 1 ? "" : "s"} left)` : " — it thawed out.";
    log.push(`  -> ❄️ ${state.pokemon.name} is frozen, sapping its Attack, Defense and Speed!${remaining}`);
  }
  return log;
}

export interface MoveResult {
  log: string[];
  hit: boolean;
  dealt: number;
  statusInflicted: StatusKind[];
}

interface ExecuteMoveOptions {
  forceMiss?: boolean;
  missReason?: "dodge" | "blind";
}

// Mutates attacker/defender state in place. Mana cost is always paid,
// whether the move connects or not — dodging/blinded-flailing still means
// the move was cast. Damage math is byte-for-byte what it was before this
// step; the only new thing on a landed hit is rolling for status inflict.
export function executeMove(
  attackerState: FighterState,
  defenderState: FighterState,
  move: Move,
  opts?: ExecuteMoveOptions
): MoveResult {
  const attacker = attackerState.pokemon;
  const defender = defenderState.pokemon;
  const cost = move.mana_cost ?? 10;

  attackerState.mp = Math.max(0, attackerState.mp - cost);
  if (cost === 0) attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + 15);

  const costStr = cost > 0 ? `-${cost} MP` : "+15 MP Energy Surge!";
  const header = `• ${attacker.name} used [${move.name}] (${move.type}, ${move.power} Pwr | ${costStr})!`;

  if (opts?.forceMiss) {
    const missLine =
      opts.missReason === "dodge"
        ? `  -> 💨 ${defender.name} dodged the attack!`
        : `  -> 🌀 ${attacker.name} is blinded and flailed, missing the attack!`;
    return { log: [header, missLine], hit: false, dealt: 0, statusInflicted: [] };
  }

  const mult = getTypeMultiplier(move.type, defender.type1, defender.type2);

  const isSpecial = move.category === "Special";
  const atkStat = Math.max(10, freezeAdjusted(isSpecial ? attacker.spatk : attacker.atk, attackerState));
  const defStat = Math.max(10, freezeAdjusted(isSpecial ? defender.spdef : defender.def, defenderState));

  const rawDmg = ((2 * 50) / 5 + 2) * (atkStat / Math.max(1, defStat)) * move.power / 50 + 2;
  const rng = randUniform(0.85, 1.15);
  const dmg = Math.max(1, Math.floor(rawDmg * mult * rng));

  defenderState.hp = Math.max(0, defenderState.hp - dmg);

  const log = [
    `${header} ${effectivenessText(mult)}`,
    `  -> Dealt ${dmg} damage! ${defender.name} HP: ${defenderState.hp} | ${attacker.name} Mana: ${attackerState.mp}/100`,
  ];

  const statusInflicted: StatusKind[] = [];
  if (defenderState.hp > 0) {
    const inflictChance = rollInflictChance(atkStat, defStat);
    if (!isSpecial && Math.random() < inflictChance) {
      defenderState.bleedTurns = STATUS_DURATION;
      statusInflicted.push("bleed");
      log.push(`  -> 🩸 ${defender.name} is bleeding!`);
    }
    if (isSpecial && Math.random() < inflictChance) {
      defenderState.blindTurns = STATUS_DURATION;
      statusInflicted.push("blind");
      log.push(`  -> 🌀 ${defender.name} is blinded!`);
    }
    // Poison-type moves roll independently of category — a physical
    // Poison-type move can inflict both bleed and poison on the same hit,
    // similar mechanism as bleed but keyed by move type instead of
    // physical/special (added alongside dodge/bleed/blind).
    if (move.type === "Poison" && Math.random() < inflictChance) {
      defenderState.poisonTurns = STATUS_DURATION;
      statusInflicted.push("poison");
      log.push(`  -> ☠️ ${defender.name} is poisoned!`);
    }
    // Fire/Ice-typed moves roll independently too, each with a type-based
    // immunity a Water/Fire-type target respectively is naturally immune to
    // (upgrades/19-burn-and-freeze-status-effects.md) -- checked before the
    // roll, same shape as any other type immunity, just for the status
    // rather than the hit itself.
    if (move.type === "Fire" && !hasType(defender, "Water") && Math.random() < inflictChance) {
      defenderState.burnTurns = STATUS_DURATION;
      statusInflicted.push("burn");
      log.push(`  -> 🔥 ${defender.name} is burned!`);
    }
    if (move.type === "Ice" && !hasType(defender, "Fire") && Math.random() < inflictChance) {
      defenderState.freezeTurns = STATUS_DURATION;
      statusInflicted.push("freeze");
      log.push(`  -> ❄️ ${defender.name} is frozen!`);
    }
  }

  return { log, hit: true, dealt: dmg, statusInflicted };
}

// Rolls blind's self-miss (and decrements blindTurns once per attack
// attempt, whether it hits or misses) and dodge, then delegates to
// executeMove with the outcome already decided.
function resolveAttack(atkState: FighterState, defState: FighterState, move: Move): MoveResult {
  let blindMiss = false;
  if (atkState.blindTurns > 0) {
    blindMiss = Math.random() < BLIND_MISS_CHANCE;
    atkState.blindTurns -= 1;
  }
  const dodged = !blindMiss && Math.random() < rollDodgeChance(atkState.pokemon.spd, defState.pokemon.spd);

  if (blindMiss || dodged) {
    return executeMove(atkState, defState, move, { forceMiss: true, missReason: blindMiss ? "blind" : "dodge" });
  }
  return executeMove(atkState, defState, move);
}

export interface BattleEvent {
  slot: RoomSlot;
  moveType: PokemonType;
  hit: boolean;
  dealt: number;
  statusInflicted: StatusKind[];
  fainted: boolean;
}

export interface RoundResult {
  log: string[];
  over: boolean;
  winner: RoomSlot | null;
  events: BattleEvent[];
}

// Mutates fighter1State/fighter2State in place (HP/MP after the round). Pure otherwise.
export function resolveRound(
  fighter1State: FighterState,
  fighter2State: FighterState,
  move1: Move,
  move2: Move
): RoundResult {
  const log: string[] = [];
  const events: BattleEvent[] = [];

  fighter1State.mp = Math.min(fighter1State.maxMp, fighter1State.mp + 15);
  fighter2State.mp = Math.min(fighter2State.maxMp, fighter2State.mp + 15);

  const p1Speed = freezeAdjusted(fighter1State.pokemon.spd, fighter1State) + randInt(-2, 2);
  const p2Speed = freezeAdjusted(fighter2State.pokemon.spd, fighter2State) + randInt(-2, 2);

  const order: Array<[FighterState, FighterState, Move, RoomSlot]> =
    p1Speed >= p2Speed
      ? [
          [fighter1State, fighter2State, move1, 1],
          [fighter2State, fighter1State, move2, 2],
        ]
      : [
          [fighter2State, fighter1State, move2, 2],
          [fighter1State, fighter2State, move1, 1],
        ];

  for (const [atkState, defState, move, slot] of order) {
    if (fighter1State.hp <= 0 || fighter2State.hp <= 0) break;

    log.push(...applyStatusTick(atkState));
    if (atkState.hp <= 0) continue; // fainted from its own tick before acting

    const result = resolveAttack(atkState, defState, move);
    log.push(...result.log);
    events.push({
      slot,
      moveType: move.type,
      hit: result.hit,
      dealt: result.dealt,
      statusInflicted: result.statusInflicted,
      fainted: defState.hp <= 0,
    });

    if (fighter1State.hp <= 0 || fighter2State.hp <= 0) break;
  }

  const over = fighter1State.hp <= 0 || fighter2State.hp <= 0;
  const winner: RoomSlot | null = !over ? null : fighter1State.hp <= 0 ? 2 : 1;

  return { log, over, winner, events };
}

export function buildFighterState(pokemon: FighterState["pokemon"]): FighterState {
  const maxHp = Math.max(50, Math.round(pokemon.hp * 2.5));
  return { hp: maxHp, maxHp, mp: 100, maxMp: 100, pokemon, bleedTurns: 0, blindTurns: 0, poisonTurns: 0, burnTurns: 0, freezeTurns: 0 };
}

// --- 3v3 online battles (upgrades/05-3v3-battles.md) — the 1v1 functions
// above stay exactly as they are, still used by the local Battle Arena. ---

export function buildTeamState(pokemon: FighterState["pokemon"][]): TeamState {
  const members = pokemon.map(buildFighterState);
  return { members: [members[0], members[1], members[2]], activeIndex: 0 };
}

function activeMember(team: TeamState): FighterState {
  return team.members[team.activeIndex];
}

function isTeamWiped(team: TeamState): boolean {
  return team.members.every((m) => m.hp <= 0);
}

export interface TeamRoundResult {
  log: string[];
  over: boolean;
  winner: RoomSlot | null;
  awaitingForcedSwitch: RoomSlot | null;
  events: BattleEvent[];
}

interface FaintOutcome {
  over: boolean;
  winner: RoomSlot | null;
  awaitingForcedSwitch: RoomSlot | null;
}

// Shared by both "attacker fainted from its own status tick" and "defender
// fainted from a hit" — same team-wipe/forced-switch bookkeeping either way.
function handleFaint(faintedSlot: RoomSlot, faintedTeam: TeamState, faintedName: string, log: string[]): FaintOutcome {
  if (isTeamWiped(faintedTeam)) {
    return { over: true, winner: faintedSlot === 1 ? 2 : 1, awaitingForcedSwitch: null };
  }
  log.push(`  -> ${faintedName} fainted! Player ${faintedSlot} must send out another Pokémon.`);
  return { over: false, winner: null, awaitingForcedSwitch: faintedSlot };
}

// Mutates team1State/team2State in place (activeIndex, HP/MP of whichever
// members acted). Switches apply before attacks; an attacker whose own
// active fainted earlier this same round can't act (mirrors the old
// resolveRound's "break on faint", generalized from "battle over" to
// "this side's queued action doesn't happen").
export function resolveTeamRound(
  team1State: TeamState,
  team2State: TeamState,
  action1: BattleAction,
  action2: BattleAction
): TeamRoundResult {
  const log: string[] = [];
  const events: BattleEvent[] = [];

  if (action1.type === "switch") log.push(...applySwitch(team1State, action1.teamIndex));
  if (action2.type === "switch") log.push(...applySwitch(team2State, action2.teamIndex));

  const active1 = activeMember(team1State);
  const active2 = activeMember(team2State);
  active1.mp = Math.min(active1.maxMp, active1.mp + 15);
  active2.mp = Math.min(active2.maxMp, active2.mp + 15);

  const p1Speed = freezeAdjusted(active1.pokemon.spd, active1) + randInt(-2, 2);
  const p2Speed = freezeAdjusted(active2.pokemon.spd, active2) + randInt(-2, 2);
  const order: RoomSlot[] = p1Speed >= p2Speed ? [1, 2] : [2, 1];

  let awaitingForcedSwitch: RoomSlot | null = null;
  let over = false;
  let winner: RoomSlot | null = null;

  for (const slot of order) {
    if (over) break;

    const action = slot === 1 ? action1 : action2;
    const atkTeam = slot === 1 ? team1State : team2State;
    const defTeam = slot === 1 ? team2State : team1State;
    const atkState = activeMember(atkTeam);

    // Status tick happens at the start of this side's turn regardless of
    // what they do this round (attack or switch) — only for whichever
    // member is currently active, post-any-switch already applied above.
    if (atkState.hp > 0) {
      log.push(...applyStatusTick(atkState));
      if (atkState.hp <= 0) {
        const outcome = handleFaint(slot, atkTeam, atkState.pokemon.name, log);
        over = outcome.over;
        winner = outcome.winner;
        if (outcome.awaitingForcedSwitch) awaitingForcedSwitch = outcome.awaitingForcedSwitch;
        if (over) break;
        continue; // fainted from the tick, can't also attack this turn
      }
    }

    if (action.type !== "attack") continue; // switches already applied above
    if (atkState.hp <= 0) continue; // defensive; already handled above

    const defState = activeMember(defTeam);
    if (defState.hp <= 0) continue; // defender already fainted earlier this round

    const move = atkState.pokemon.moves[action.moveIndex];
    if (!move) continue; // validated by the caller before reaching here

    const result = resolveAttack(atkState, defState, move);
    log.push(...result.log);
    events.push({
      slot,
      moveType: move.type,
      hit: result.hit,
      dealt: result.dealt,
      statusInflicted: result.statusInflicted,
      fainted: defState.hp <= 0,
    });

    if (defState.hp <= 0) {
      const defSlot: RoomSlot = slot === 1 ? 2 : 1;
      const outcome = handleFaint(defSlot, defTeam, defState.pokemon.name, log);
      over = outcome.over;
      winner = outcome.winner;
      if (outcome.awaitingForcedSwitch) awaitingForcedSwitch = outcome.awaitingForcedSwitch;
      if (over) break;
    }
  }

  return { log, over, winner, awaitingForcedSwitch, events };
}

function applySwitch(team: TeamState, teamIndex: 0 | 1 | 2): string[] {
  const from = activeMember(team).pokemon.name;
  team.activeIndex = teamIndex;
  const to = activeMember(team).pokemon.name;
  return [`↩️ ${from} is withdrawn! ${to}, go!`];
}

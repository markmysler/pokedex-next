import type { BattleAction, FighterState, RoomSlot, TeamState, Move } from "@/types/pokemon";
import { getTypeMultiplier } from "./typeData";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function effectivenessText(mult: number): string {
  if (mult >= 2.0) return "⚡ SUPER EFFECTIVE! (2.0x)";
  if (mult === 0.0) return "🛡️ NO EFFECT (0.0x)";
  if (mult < 1.0) return "🛡️ Not very effective... (0.5x)";
  return "💥 Normal Hit (1.0x)";
}

// Mutates attacker/defender state in place; returns the two log lines for this move.
export function executeMove(
  attackerState: FighterState,
  defenderState: FighterState,
  move: Move
): string[] {
  const attacker = attackerState.pokemon;
  const defender = defenderState.pokemon;
  const cost = move.mana_cost ?? 10;

  attackerState.mp = Math.max(0, attackerState.mp - cost);
  if (cost === 0) attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + 15);

  const mult = getTypeMultiplier(move.type, defender.type1, defender.type2);

  const isSpecial = move.category === "Special";
  const atkStat = Math.max(10, isSpecial ? attacker.spatk : attacker.atk);
  const defStat = Math.max(10, isSpecial ? defender.spdef : defender.def);

  const rawDmg = ((2 * 50) / 5 + 2) * (atkStat / Math.max(1, defStat)) * move.power / 50 + 2;
  const rng = randUniform(0.85, 1.15);
  const dmg = Math.max(1, Math.floor(rawDmg * mult * rng));

  defenderState.hp = Math.max(0, defenderState.hp - dmg);

  const costStr = cost > 0 ? `-${cost} MP` : "+15 MP Energy Surge!";
  return [
    `• ${attacker.name} used [${move.name}] (${move.type}, ${move.power} Pwr | ${costStr})! ${effectivenessText(mult)}`,
    `  -> Dealt ${dmg} damage! ${defender.name} HP: ${defenderState.hp} | ${attacker.name} Mana: ${attackerState.mp}/100`,
  ];
}

export interface RoundResult {
  log: string[];
  over: boolean;
  winner: RoomSlot | null;
}

// Mutates fighter1State/fighter2State in place (HP/MP after the round). Pure otherwise.
export function resolveRound(
  fighter1State: FighterState,
  fighter2State: FighterState,
  move1: Move,
  move2: Move
): RoundResult {
  const log: string[] = [];

  fighter1State.mp = Math.min(fighter1State.maxMp, fighter1State.mp + 15);
  fighter2State.mp = Math.min(fighter2State.maxMp, fighter2State.mp + 15);

  const p1Speed = fighter1State.pokemon.spd + randInt(-2, 2);
  const p2Speed = fighter2State.pokemon.spd + randInt(-2, 2);

  const order: Array<[FighterState, FighterState, Move]> =
    p1Speed >= p2Speed
      ? [
          [fighter1State, fighter2State, move1],
          [fighter2State, fighter1State, move2],
        ]
      : [
          [fighter2State, fighter1State, move2],
          [fighter1State, fighter2State, move1],
        ];

  for (const [atkState, defState, move] of order) {
    log.push(...executeMove(atkState, defState, move));
    if (fighter1State.hp <= 0 || fighter2State.hp <= 0) break;
  }

  const over = fighter1State.hp <= 0 || fighter2State.hp <= 0;
  const winner: RoomSlot | null = !over ? null : fighter1State.hp <= 0 ? 2 : 1;

  return { log, over, winner };
}

export function buildFighterState(pokemon: FighterState["pokemon"]): FighterState {
  const maxHp = Math.max(50, Math.round(pokemon.hp * 2.5));
  return { hp: maxHp, maxHp, mp: 100, maxMp: 100, pokemon };
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

  if (action1.type === "switch") log.push(...applySwitch(team1State, action1.teamIndex));
  if (action2.type === "switch") log.push(...applySwitch(team2State, action2.teamIndex));

  const active1 = activeMember(team1State);
  const active2 = activeMember(team2State);
  active1.mp = Math.min(active1.maxMp, active1.mp + 15);
  active2.mp = Math.min(active2.maxMp, active2.mp + 15);

  const p1Speed = active1.pokemon.spd + randInt(-2, 2);
  const p2Speed = active2.pokemon.spd + randInt(-2, 2);
  const order: RoomSlot[] = p1Speed >= p2Speed ? [1, 2] : [2, 1];

  let awaitingForcedSwitch: RoomSlot | null = null;
  let over = false;
  let winner: RoomSlot | null = null;

  for (const slot of order) {
    const action = slot === 1 ? action1 : action2;
    if (action.type !== "attack") continue; // switches already applied above

    const atkTeam = slot === 1 ? team1State : team2State;
    const defTeam = slot === 1 ? team2State : team1State;
    const atkState = activeMember(atkTeam);
    if (atkState.hp <= 0) continue; // fainted before its turn came up this round

    const defState = activeMember(defTeam);
    const move = atkState.pokemon.moves[action.moveIndex];
    if (!move) continue; // validated by the caller before reaching here

    log.push(...executeMove(atkState, defState, move));

    if (defState.hp <= 0) {
      const defSlot: RoomSlot = slot === 1 ? 2 : 1;
      if (isTeamWiped(defTeam)) {
        over = true;
        winner = slot;
        break;
      }
      awaitingForcedSwitch = defSlot;
      log.push(`  -> ${defState.pokemon.name} fainted! Player ${defSlot} must send out another Pokémon.`);
    }
  }

  return { log, over, winner, awaitingForcedSwitch };
}

function applySwitch(team: TeamState, teamIndex: 0 | 1 | 2): string[] {
  const from = activeMember(team).pokemon.name;
  team.activeIndex = teamIndex;
  const to = activeMember(team).pokemon.name;
  return [`↩️ ${from} is withdrawn! ${to}, go!`];
}

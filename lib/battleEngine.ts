import type { FighterState, Move, RoomSlot } from "@/types/pokemon";
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

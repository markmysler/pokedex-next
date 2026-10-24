import type { BattleAction, OwnedPokemon, RoomSlot, TeamState } from "@/types/pokemon";
import { buildTeamState, resolveTeamRound, type BattleEvent, type BattleLogEvent } from "./battleEngine";
import { validateAction } from "./battleValidation";
import { rollBotTeam } from "./collection";

// Server-side bot battles (supabase/migrations/20261024000200_server_bot_battles.sql).
// Pure functions over the stored state, so the same rules can be unit
// tested without a database; app/api/battles/bot/** does the persistence.

export interface BotBattleState {
  team1: TeamState; // the player
  team2: TeamState; // the bot
  awaitingForcedSwitch: RoomSlot | null;
  turnCount: number;
  over: boolean;
  winner: RoomSlot | null;
}

// One numbered step of the battle log, as the client renders it: a full
// round, or a single forced switch.
export interface BotBattleTurn {
  turn: number;
  log: BattleLogEvent[];
  events: BattleEvent[];
}

export type BotRoundOutcome = { ok: true; state: BotBattleState; turns: BotBattleTurn[] } | { ok: false; error: string };

export function createBotBattleState(playerTeam: OwnedPokemon[]): BotBattleState {
  const playerTeamAverageTotal = playerTeam.reduce((sum, p) => sum + p.total, 0) / playerTeam.length;
  return {
    team1: buildTeamState(playerTeam),
    team2: buildTeamState(rollBotTeam(playerTeamAverageTotal)),
    awaitingForcedSwitch: null,
    turnCount: 0,
    over: false,
    winner: null,
  };
}

// The bot's choice, unchanged from the old client-side version: a random
// castable move, or whichever move has the most uses left if somehow none
// are castable (every instance always keeps at least one unlimited move, so
// that fallback is only a no-crash guarantee).
export function pickBotAttackAction(team: TeamState, random: () => number = Math.random): BattleAction {
  const active = team.members[team.activeIndex];
  const moves = active.pokemon.moves;
  const castable = moves.map((_, i) => i).filter((i) => active.moveUses[i] !== 0);
  if (castable.length) {
    return { type: "attack", moveIndex: castable[Math.floor(random() * castable.length)] };
  }
  let mostAvailableIndex = 0;
  let mostAvailableUses = -1;
  moves.forEach((_, i) => {
    const uses = active.moveUses[i];
    const comparable = uses === null ? Infinity : uses;
    if (comparable > mostAvailableUses) {
      mostAvailableUses = comparable;
      mostAvailableIndex = i;
    }
  });
  return { type: "attack", moveIndex: mostAvailableIndex };
}

export function firstAliveBenchIndex(team: TeamState): 0 | 1 | 2 | null {
  const i = team.members.findIndex((m, idx) => idx !== team.activeIndex && m.hp > 0);
  return i === -1 ? null : (i as 0 | 1 | 2);
}

function switchTurn(team: TeamState, teamIndex: 0 | 1 | 2, turn: number): BotBattleTurn {
  const from = team.members[team.activeIndex].pokemon.name;
  const to = team.members[teamIndex].pokemon.name;
  team.activeIndex = teamIndex;
  return { turn, log: [{ type: "switched", from, to }], events: [] };
}

// Applies one player action to a copy of the state. Returns the new state
// and the numbered turns it produced: the player's forced switch, or a full
// round, followed by the bot's own forced switch when the round knocked out
// its active Pokemon (the bot never has a real choice to make there).
export function playBotRound(current: BotBattleState, action: BattleAction): BotRoundOutcome {
  if (current.over) return { ok: false, error: "This battle is over" };
  if (!action || (action.type !== "attack" && action.type !== "switch")) return { ok: false, error: "Invalid action" };

  const state: BotBattleState = structuredClone(current);
  const turns: BotBattleTurn[] = [];

  if (state.awaitingForcedSwitch === 1) {
    if (action.type !== "switch") return { ok: false, error: "You must switch in a new Pokemon" };
    const error = validateAction(action, state.team1);
    if (error) return { ok: false, error };
    state.turnCount += 1;
    turns.push(switchTurn(state.team1, action.teamIndex, state.turnCount));
    state.awaitingForcedSwitch = null;
    return { ok: true, state, turns };
  }

  const error = validateAction(action, state.team1);
  if (error) return { ok: false, error };

  const botAction = pickBotAttackAction(state.team2);
  const result = resolveTeamRound(state.team1, state.team2, action, botAction);
  state.turnCount += 1;
  turns.push({ turn: state.turnCount, log: result.log, events: result.events });
  state.over = result.over;
  state.winner = result.winner;
  state.awaitingForcedSwitch = result.awaitingForcedSwitch;

  if (!state.over && state.awaitingForcedSwitch === 2) {
    const benchIndex = firstAliveBenchIndex(state.team2);
    if (benchIndex !== null) {
      state.turnCount += 1;
      turns.push(switchTurn(state.team2, benchIndex, state.turnCount));
    }
    state.awaitingForcedSwitch = null;
  }

  return { ok: true, state, turns };
}

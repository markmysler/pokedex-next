import type { BattleAction, TeamState } from "@/types/pokemon";

// The authoritative check for a player's battle action (upgrades/43-uses-ui-
// and-server-validation.md), shared by online rooms and server-side bot
// battles. Client-side disabling (MoveButton/BattleArena/OnlineBattle) is UX
// only, never trusted on its own. A null moveUses entry is always
// attemptable (unlimited); only an exact 0 is rejected.
export function isIndex(value: unknown, length: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
}

export function validateAction(action: BattleAction, team: TeamState): string | null {
  if (action.type === "attack") {
    const active = team.members[team.activeIndex];
    if (active.hp <= 0) return "Your active Pokemon has fainted";
    if (!isIndex(action.moveIndex, active.pokemon.moves.length)) return "Invalid move";
    if (action.buffTargetTeamIndex !== undefined && !isIndex(action.buffTargetTeamIndex, team.members.length)) {
      return "Invalid target";
    }
    const usesLeft = active.moveUses[action.moveIndex];
    if (usesLeft !== null && usesLeft <= 0) return "No uses left for that move this battle";
    return null;
  }
  if (action.type === "switch") {
    // Indexes come straight from the request body: anything but an in-range
    // integer (e.g. "length", 1.5, -1) would otherwise index the array as a
    // property and corrupt activeIndex.
    if (!isIndex(action.teamIndex, team.members.length)) return "Invalid team slot";
    const target = team.members[action.teamIndex];
    if (action.teamIndex === team.activeIndex) return "That Pokemon is already active";
    if (target.hp <= 0) return "That Pokemon has fainted";
    return null;
  }
  return "Invalid action";
}

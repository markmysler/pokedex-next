import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFighterState, buildTeamState, executeMove, resolveTeamRound } from "@/lib/battleEngine";
import type { DamageMove, Move } from "@/types/pokemon";
import { makePokemon, makeTeam } from "./fixtures";

const tackle: DamageMove = { name: "Test Tackle", type: "Normal", kind: "damage", category: "Physical", power: 60, max_uses: 5 };

// A Pokemon whose only move is `move`, so tests know exactly what it casts.
function fighterWith(number: string, move: Move) {
  return buildFighterState(makePokemon(number, { moves: [move] }));
}

afterEach(() => vi.restoreAllMocks());

describe("executeMove", () => {
  it("deals no damage across a 0x type immunity (Normal into Ghost)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // never dodged, no status
    const attacker = fighterWith("019", tackle); // Rattata, Normal
    const ghost = fighterWith("094", tackle); // Gengar, Ghost/Poison
    const before = ghost.hp;
    const result = executeMove(attacker, ghost, attacker.pokemon.moves[0]);
    expect(result.dealt).toBe(0);
    expect(ghost.hp).toBe(before);
  });

  it("deals damage to a normal matchup", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const attacker = fighterWith("019", tackle);
    const target = fighterWith("016", tackle); // Pidgey, Normal/Flying
    const result = executeMove(attacker, target, attacker.pokemon.moves[0]);
    expect(result.hit).toBe(true);
    expect(result.dealt).toBeGreaterThan(0);
    expect(target.hp).toBe(target.maxHp - result.dealt);
  });

  it("refuses a move with no uses left", () => {
    const attacker = fighterWith("019", { ...tackle, power: 90 });
    attacker.moveUses[0] = 0;
    expect(() => executeMove(attacker, fighterWith("016", tackle), attacker.pokemon.moves[0])).toThrow(/no uses left/);
  });
});

describe("buildFighterState", () => {
  it("makes the weakest damage move free and keeps the others' limits", () => {
    const weak: DamageMove = { ...tackle, name: "Weak", power: 20, max_uses: 3 };
    const strong: DamageMove = { ...tackle, name: "Strong", power: 100, max_uses: 2 };
    const fighter = buildFighterState(makePokemon("019", { moves: [strong, weak] }));
    expect(fighter.moveUses).toEqual([2, null]);
  });
});

describe("resolveTeamRound", () => {
  it("counts a cast against the move's uses", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const strong: DamageMove = { ...tackle, name: "Strong", power: 100, max_uses: 2 };
    const weak: DamageMove = { ...tackle, name: "Weak", power: 20, max_uses: 3 };
    const team1 = buildTeamState([makePokemon("019", { moves: [strong, weak] }), ...makeTeam(["001", "004", "007"]).slice(0, 2)]);
    const team2 = buildTeamState(makeTeam(["016", "001", "004"]));
    resolveTeamRound(team1, team2, { type: "attack", moveIndex: 0 }, { type: "switch", teamIndex: 1 });
    expect(team1.members[0].moveUses[0]).toBe(1);
  });

  it("ends the battle when the last Pokemon faints", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const team1 = buildTeamState(makeTeam(["019", "001", "004"]).map((p) => ({ ...p, moves: [tackle] })));
    const team2 = buildTeamState(makeTeam(["016", "001", "004"]).map((p) => ({ ...p, moves: [tackle] })));
    team2.members[1].hp = 0;
    team2.members[2].hp = 0;
    team2.members[0].hp = 1;
    const result = resolveTeamRound(team1, team2, { type: "attack", moveIndex: 0 }, { type: "attack", moveIndex: 0 });
    expect(result.over).toBe(true);
    expect(result.winner).toBe(1);
  });
});

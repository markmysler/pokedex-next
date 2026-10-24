import { describe, expect, it } from "vitest";
import { createBotBattleState, firstAliveBenchIndex, pickBotAttackAction, playBotRound, type BotBattleState } from "@/lib/botBattle";
import { makeTeam } from "./fixtures";

function newBattle(): BotBattleState {
  return createBotBattleState(makeTeam(["025", "001", "004"]));
}

function firstMove(state: BotBattleState) {
  const active = state.team1.members[state.team1.activeIndex];
  const moveIndex = active.moveUses.findIndex((uses) => uses !== 0);
  return { type: "attack" as const, moveIndex };
}

describe("playBotRound", () => {
  it("resolves a round on a copy and numbers it", () => {
    const start = newBattle();
    const before = JSON.stringify(start);
    const outcome = playBotRound(start, firstMove(start));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(JSON.stringify(start)).toBe(before); // input state untouched
    expect(outcome.turns[0].turn).toBe(1);
    expect(outcome.turns[0].log.length).toBeGreaterThan(0);
    expect(outcome.state.turnCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid actions instead of resolving them", () => {
    const start = newBattle();
    expect(playBotRound(start, { type: "switch", teamIndex: 0 })).toEqual({ ok: false, error: "That Pokemon is already active" });
    expect(playBotRound(start, { type: "attack", moveIndex: 42 })).toEqual({ ok: false, error: "Invalid move" });
  });

  it("only accepts a switch while the player must replace a fainted Pokemon", () => {
    const start = newBattle();
    start.awaitingForcedSwitch = 1;
    start.team1.members[0].hp = 0;
    expect(playBotRound(start, firstMove(start))).toEqual({ ok: false, error: "You must switch in a new Pokemon" });
    const outcome = playBotRound(start, { type: "switch", teamIndex: 2 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.state.team1.activeIndex).toBe(2);
    expect(outcome.state.awaitingForcedSwitch).toBeNull();
    expect(outcome.turns).toHaveLength(1);
  });

  it("replaces the bot's fainted Pokemon itself and never leaves the bot waiting", () => {
    // Make the bot's active Pokemon faint to anything, then attack it.
    for (let attempt = 0; attempt < 50; attempt++) {
      const start = newBattle();
      start.team2.members[0].hp = 1;
      const outcome = playBotRound(start, firstMove(start));
      if (!outcome.ok) throw new Error(outcome.error);
      if (outcome.state.team2.members[0].hp > 0) continue; // dodged; try again
      expect(outcome.state.awaitingForcedSwitch).not.toBe(2);
      expect(outcome.state.team2.activeIndex).not.toBe(0);
      expect(outcome.turns).toHaveLength(2);
      expect(outcome.turns[1].log[0].type).toBe("switched");
      return;
    }
    throw new Error("the bot's Pokemon never fainted in 50 tries");
  });

  it("plays a whole battle to a single winner", () => {
    let state = newBattle();
    for (let i = 0; i < 500 && !state.over; i++) {
      const action =
        state.awaitingForcedSwitch === 1
          ? { type: "switch" as const, teamIndex: firstAliveBenchIndex(state.team1)! }
          : firstMove(state);
      const outcome = playBotRound(state, action);
      if (!outcome.ok) throw new Error(outcome.error);
      state = outcome.state;
    }
    expect(state.over).toBe(true);
    expect([1, 2]).toContain(state.winner);
    expect(playBotRound(state, firstMove(state))).toEqual({ ok: false, error: "This battle is over" });
  });
});

describe("pickBotAttackAction", () => {
  it("only picks moves with uses left", () => {
    const state = newBattle();
    const active = state.team2.members[0];
    active.moveUses = active.moveUses.map((uses, i) => (i === 0 ? uses : 0));
    for (let i = 0; i < 20; i++) {
      expect(pickBotAttackAction(state.team2)).toEqual({ type: "attack", moveIndex: 0 });
    }
  });
});

import { describe, expect, it } from "vitest";
import { buildTeamState } from "@/lib/battleEngine";
import { validateAction } from "@/lib/battleValidation";
import type { BattleAction } from "@/types/pokemon";
import { makeTeam } from "./fixtures";

function team() {
  return buildTeamState(makeTeam(["001", "004", "007"]));
}

// Actions arrive as JSON from the client, so anything can be in them.
const raw = (action: unknown) => action as BattleAction;

describe("validateAction", () => {
  it("accepts a normal attack and switch", () => {
    expect(validateAction({ type: "attack", moveIndex: 0 }, team())).toBeNull();
    expect(validateAction({ type: "switch", teamIndex: 1 }, team())).toBeNull();
  });

  it.each([["length"], [1.5], [-1], [3], [null], ["1"], [{}]])("rejects switch teamIndex %j", (teamIndex) => {
    expect(validateAction(raw({ type: "switch", teamIndex }), team())).not.toBeNull();
  });

  it.each([["length"], [0.5], [-1], [4], [99], [null], ["0"]])("rejects attack moveIndex %j", (moveIndex) => {
    expect(validateAction(raw({ type: "attack", moveIndex }), team())).not.toBeNull();
  });

  it("rejects a bad buff target but allows none", () => {
    expect(validateAction(raw({ type: "attack", moveIndex: 0, buffTargetTeamIndex: "length" }), team())).not.toBeNull();
    expect(validateAction(raw({ type: "attack", moveIndex: 0, buffTargetTeamIndex: 5 }), team())).not.toBeNull();
    expect(validateAction({ type: "attack", moveIndex: 0, buffTargetTeamIndex: 2 }, team())).toBeNull();
  });

  it("rejects switching to the active or a fainted Pokemon", () => {
    const t = team();
    expect(validateAction({ type: "switch", teamIndex: 0 }, t)).toBe("That Pokemon is already active");
    t.members[2].hp = 0;
    expect(validateAction({ type: "switch", teamIndex: 2 }, t)).toBe("That Pokemon has fainted");
  });

  it("rejects attacking with a fainted active Pokemon or a used-up move", () => {
    const t = team();
    t.members[0].moveUses[0] = 0;
    expect(validateAction({ type: "attack", moveIndex: 0 }, t)).toBe("No uses left for that move this battle");
    t.members[0].hp = 0;
    expect(validateAction({ type: "attack", moveIndex: 1 }, t)).toBe("Your active Pokemon has fainted");
  });

  it("rejects unknown action types", () => {
    expect(validateAction(raw({ type: "run" }), team())).toBe("Invalid action");
  });
});

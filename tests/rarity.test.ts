import { describe, expect, it } from "vitest";
import { GRADES, gradeForTotal, gradeOdds, rollReelFiller, speciesGrade } from "@/lib/rarity";
import { pokedex, pokedexOrder } from "@/lib/pokedex";

describe("gradeForTotal", () => {
  it("puts each cutoff in the higher grade", () => {
    expect(gradeForTotal(329)).toBe("common");
    expect(gradeForTotal(330)).toBe("uncommon");
    expect(gradeForTotal(449)).toBe("uncommon");
    expect(gradeForTotal(450)).toBe("rare");
    expect(gradeForTotal(500)).toBe("epic");
    expect(gradeForTotal(579)).toBe("epic");
    expect(gradeForTotal(580)).toBe("legendary");
  });
});

describe("speciesGrade", () => {
  it("makes exactly the 7 strongest species legendary", () => {
    const legendary = pokedexOrder.filter((n) => speciesGrade(n) === "legendary").map((n) => pokedex[n].name).sort();
    expect(legendary).toEqual(["Articuno", "Dragonite", "Mew", "Mewtwo", "Moltres", "Tyranitar", "Zapdos"]);
  });

  it("treats an unknown species as common rather than throwing", () => {
    expect(speciesGrade("999")).toBe("common");
  });
});

describe("gradeOdds", () => {
  it("sums to 1 and gives every grade a share", () => {
    const odds = gradeOdds();
    const sum = GRADES.reduce((s, g) => s + odds[g], 0);
    expect(sum).toBeCloseTo(1, 10);
    for (const g of GRADES) expect(odds[g]).toBeGreaterThan(0);
  });
});

describe("rollReelFiller", () => {
  it("picks a real species and respects the random source", () => {
    const low = rollReelFiller(() => 0);
    expect(low).toEqual({ number: pokedexOrder[0], shiny: true });
    const high = rollReelFiller(() => 0.999999);
    expect(high.number).toBe(pokedexOrder[pokedexOrder.length - 1]);
    expect(high.shiny).toBe(false);
  });
});

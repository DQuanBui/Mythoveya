import { describe, expect, it } from "vitest";
import { battleSummary, unitLabel } from "../apps/client/src/battle-labels";
import { elementMultiplier, matchupWord, teamCoverage } from "../packages/shared/elements";

describe("battle creature labels", () => {
  it("read out health alone when nothing else applies", () => {
    expect(unitLabel("Emberfox", 54, 78, 0, [])).toBe("Emberfox 54 of 78");
  });
  it("add the shield and each lasting status in plain words", () => {
    expect(
      unitLabel("Mossprig", 20, 61, 12, [
        { kind: "stun", turns: 1 },
        { kind: "burn", turns: 2 },
      ]),
    ).toBe("Mossprig 20 of 61, shield 12, stunned for 1 round, burning for 2 rounds");
    expect(unitLabel("Pebblit", 5, 40, 0, [{ kind: "mystery", turns: 3 }])).toBe("Pebblit 5 of 40, mystery for 3 rounds");
  });
});

describe("element matchups", () => {
  it("name strong and resisted attacks, and agree with the damage multiplier", () => {
    expect(matchupWord("Flame", "Grove")).toBe("strong");
    expect(matchupWord("Grove", "Flame")).toBe("resisted");
    expect(matchupWord("Light", "Shadow")).toBe("strong");
    expect(matchupWord("Frost", "Flame")).toBe("");
    for (const a of ["Flame", "Grove", "Stone", "Storm", "Tide", "Light", "Shadow", "Frost"])
      for (const b of ["Flame", "Grove", "Stone", "Storm", "Tide", "Light", "Shadow", "Frost"]) {
        const m = elementMultiplier(a, b);
        expect(matchupWord(a, b)).toBe(m > 1 ? "strong" : m < 1 ? "resisted" : "");
      }
  });
});

describe("battle summary", () => {
  it("counts from the viewer's side", () => {
    const units = [
      { side: 0, hp: 10 },
      { side: 0, hp: 0 },
      { side: 1, hp: 0 },
      { side: 1, hp: 0 },
      { side: 1, hp: 5 },
    ];
    expect(battleSummary(units, 0, 7)).toBe("Settled in round 7 · 1 of 2 companions still standing · 2 of 3 foes calmed");
    expect(battleSummary(units, 1, 7)).toBe("Settled in round 7 · 1 of 3 companions still standing · 1 of 2 foes calmed");
  });
});

describe("team coverage", () => {
  it("lists what a team strikes strongly and what it has no answer to", () => {
    expect(teamCoverage([])).toEqual({ strong: [], gaps: ["Flame", "Grove", "Stone", "Storm", "Tide", "Frost", "Light", "Shadow"] });
    const { strong, gaps } = teamCoverage(["Flame", "Light"]);
    expect(strong).toEqual(["Grove", "Shadow"]);
    expect(gaps).toContain("Frost");
    expect([...strong, ...gaps]).toHaveLength(8);
  });
});

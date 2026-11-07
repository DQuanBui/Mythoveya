import { describe, expect, it } from "vitest";
import { ELEMENT_NAMES, elementGuide, elementMultiplier } from "../packages/shared/elements";

describe("elementGuide", () => {
  const { rows, strong, resisted } = elementGuide();
  it("covers every element and agrees with the battle engine", () => {
    expect(rows.map((r) => r.name)).toEqual(ELEMENT_NAMES);
    for (const r of rows)
      for (const foe of ELEMENT_NAMES) {
        const m = elementMultiplier(r.name, foe);
        expect(r.strong.includes(foe)).toBe(m > 1);
        expect(r.resisted.includes(foe)).toBe(m < 1);
      }
  });
  it("quotes the real multipliers", () => {
    expect(strong).toBeGreaterThan(1);
    expect(resisted).toBeLessThan(1);
    expect(rows.some((r) => r.strong.some((foe) => elementMultiplier(r.name, foe) === strong))).toBe(true);
    expect(rows.some((r) => r.resisted.some((foe) => elementMultiplier(r.name, foe) === resisted))).toBe(true);
  });
});

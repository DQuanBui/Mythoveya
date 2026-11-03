import { describe, expect, it } from "vitest";
import { unitLabel } from "../apps/client/src/battle-labels";

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

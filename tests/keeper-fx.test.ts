import { describe, it, expect } from "vitest";
import { EMOTES, keeperEmote, playEmote } from "../apps/client/src/village-materials";
import { leavePrint, recentPrints } from "../apps/client/src/Footprints";
import { PHOTO_FILTERS, photoCss } from "../apps/client/src/photo";
import { PUFF_LOOK, emitPuff, recentPuffs } from "../apps/client/src/puff-buffer";

describe("keeper emotes, footprints and photo filters", () => {
  it("plays timed emotes once and toggles lasting ones off on a second press", () => {
    expect(EMOTES.map((e) => e.id)).toEqual(["wave", "cheer", "dance", "sit"]);
    const before = Date.now();
    playEmote("cheer");
    expect(keeperEmote.name).toBe("cheer");
    expect(keeperEmote.until).toBeGreaterThanOrEqual(before + 3000);
    playEmote("cheer");
    expect(keeperEmote.name).toBe("cheer");
    playEmote("sit");
    expect(keeperEmote).toMatchObject({ name: "sit", until: Infinity });
    playEmote("sit");
    expect(keeperEmote.name).toBe("");
  });

  it("alternates prints either side of the path and keeps only the most recent 48", () => {
    for (let i = 0; i < 60; i++) leavePrint(0, 0, i, 0, i, i % 2 === 0);
    const prints = recentPrints();
    expect(prints).toHaveLength(48);
    expect(prints.at(-1)!.z).toBe(59);
    expect(Math.sign(prints.at(-1)!.x)).toBe(-Math.sign(prints.at(-2)!.x));
    expect(Math.abs(prints.at(-1)!.x)).toBeCloseTo(0.09);
  });

  it("maps every photo filter to a CSS filter", () => {
    expect(photoCss("natural")).toBe("none");
    for (const f of PHOTO_FILTERS) expect(photoCss(f.id)).toMatch(/none|\w+\(/);
  });

  it("keeps only the most recent 32 puffs, oldest first", () => {
    for (let i = 0; i < 40; i++) emitPuff(i, 1.5, 0, 0, 1, i, "breath");
    const puffs = recentPuffs();
    expect(puffs).toHaveLength(32);
    expect(puffs[0].x).toBe(8);
    expect(puffs.at(-1)).toMatchObject({ x: 39, kind: "breath" });
  });

  it("styles dust and snow kicks shorter-lived and lower than breath", () => {
    for (const kind of ["dust", "snow"] as const) {
      expect(PUFF_LOOK[kind].life).toBeLessThan(PUFF_LOOK.breath.life);
      expect(PUFF_LOOK[kind].rise).toBeLessThan(PUFF_LOOK.breath.rise);
    }
  });
});

import { describe, it, expect } from "vitest";
import { MILESTONES, milestoneProgress, keeperTitle } from "../packages/shared/milestones";
import { newProfile } from "../apps/server/new-profile";

describe("keeper milestones", () => {
  it("start empty for a new keeper and have unique ids and titles", () => {
    const p = newProfile("m", "Fresh", 0);
    expect(keeperTitle(p)).toBeUndefined();
    expect(milestoneProgress(p).every((m) => !m.done && m.value >= 0)).toBe(true);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    expect(new Set(MILESTONES.map((m) => m.title)).size).toBe(MILESTONES.length);
  });

  it("reads progress from the save and shows the most prestigious title", () => {
    const p = newProfile("m", "Veteran", 0);
    p.wins = 40;
    expect(keeperTitle(p)).toBe("Brave Heart");
    expect(milestoneProgress(p).find((m) => m.id === "wins")).toMatchObject({ value: 25, done: true });
    p.adventure = { stages: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`c${n}-4`, 3])), chests: [], best: {}, dungeonDay: "", runs: {}, gearSeq: 0 };
    expect(keeperTitle(p)).toBe("Rift Warden");
    // Legacy saves without the optional sections still work.
    delete p.town;
    delete p.seasons;
    expect(() => milestoneProgress(p)).not.toThrow();
  });
});

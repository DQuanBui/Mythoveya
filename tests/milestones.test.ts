import { describe, it, expect } from "vitest";
import { MILESTONES, earnedMilestones, milestoneProgress, keeperTitle, newlyEarned } from "../packages/shared/milestones";
import { newProfile } from "../apps/server/new-profile";
import { ALL_SPECIES } from "../packages/shared/content";

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
describe("newlyEarned", () => {
  const save = (wins: number) => ({ ...newProfile("m", "Fresh", 0), wins });
  it("names a title reached since the last look, and only then", () => {
    const before = earnedMilestones(save(24));
    expect(before.has("wins")).toBe(false);
    expect(newlyEarned(before, save(24))).toBeUndefined();
    expect(newlyEarned(before, save(25))?.title).toBe("Brave Heart");
    expect(newlyEarned(earnedMilestones(save(25)), save(26))).toBeUndefined();
  });
});
describe("Night Watcher", () => {
  it("counts different creatures met only at certain times", () => {
    const p = newProfile("m", "Owl", 0),
      own = (species: string) => p.owned.push({ id: species, species, level: 1, xp: 0, shards: 0, upgrade: 0, locked: false });
    const watcher = () => milestoneProgress(p).find((m) => m.id === "after-dark")!;
    for (const s of ["duskblob", "lanternmoth", "dawnfawn", "bubbloom"]) own(s);
    own("mossprig");
    expect(watcher().value).toBe(4);
    own("prismoth");
    expect(watcher().done).toBe(true);
  });
});
describe("Field Naturalist", () => {
  it("counts creatures met in battle as well as companions, each once", () => {
    const p = newProfile("m", "Naturalist", 0);
    const naturalist = () => milestoneProgress(p).find((m) => m.id === "naturalist")!;
    p.seen = ALL_SPECIES.slice(0, 30).map((s) => s.id);
    p.owned.push(...ALL_SPECIES.slice(25, 39).map((s) => ({ id: s.id, species: s.id, level: 1, xp: 0, shards: 0, upgrade: 0, locked: false })));
    expect(naturalist().value).toBe(39);
    p.seen.push(ALL_SPECIES[39].id);
    expect(naturalist().done).toBe(true);
  });
});

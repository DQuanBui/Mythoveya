import { expect, it } from "vitest";
import { CHAPTERS } from "../packages/shared/adventure";
import { CHAPTER_STORY } from "../packages/shared/story";
import { NPCS } from "../packages/shared/town";

it("gives every Riftgate chapter a spoken prologue and epilogue by known speakers", () => {
  const speakers = new Set([...NPCS.map((n) => n.id), "boss"]);
  expect(Object.keys(CHAPTER_STORY).sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
  for (const c of CHAPTERS) {
    expect(c.stages[3].boss, c.id).toBeTruthy();
    for (const kind of ["intro", "outro"] as const) {
      const lines = CHAPTER_STORY[c.id][kind];
      expect(lines.length, `${c.id} ${kind}`).toBeGreaterThanOrEqual(3);
      expect(lines.some((l) => l.speaker === "boss"), `${c.id} ${kind} boss`).toBe(true);
      for (const l of lines) {
        expect(speakers.has(l.speaker), l.speaker).toBe(true);
        expect(l.text.length).toBeGreaterThan(20);
        expect(l.text.length).toBeLessThan(180);
      }
    }
  }
});

import { describe, it, expect } from "vitest";
import { currentObjective } from "../apps/client/src/world-guide";
import type { Profile } from "../packages/shared/types";
describe("quest navigation", () => {
  const p = { quests: {}, claims: [], wins: 0 } as unknown as Profile;
  it("moves the waypoint from Liora to the first encounter", () => {
    expect(currentObjective(p).target).toBe("guide");
    expect(currentObjective({ ...p, quests: { guide: 1 } }).target).toBe(
      "encounter",
    );
  });
  it("directs victory rewards to the quest panel before pointing at the shrine", () => {
    const winner = { ...p, wins: 1, quests: { guide: 1 } };
    expect(currentObjective(winner)).toMatchObject({
      action: "quests",
      completed: 2,
    });
    expect(currentObjective(winner).target).toBeUndefined();
    expect(currentObjective({ ...winner, claims: ["tutorial"] }).target).toBe(
      "recruit",
    );
  });
  it("keeps completed introductions useful through region unlocks", () => {
    const keeper = {
      ...p,
      wins: 2,
      claims: ["tutorial"],
      quests: { guide: 1, recruit: 1 },
    };
    expect(currentObjective(keeper)).toMatchObject({
      completed: 3,
      target: "encounter",
    });
    expect(currentObjective(keeper).text).toContain("3 more battles");
    expect(currentObjective({ ...keeper, wins: 5 }).target).toBe("boss");
  });
});

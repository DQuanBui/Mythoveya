import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkingCompanion } from "../packages/shared/follower";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-follower-")), "save.sqlite");
const { createProfile, authenticate, operation, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const run = (token: string, kind: string, v: Record<string, unknown> = {}) =>
  operation(token, crypto.randomUUID(), (p) => game.mutate(p, kind, v));

describe("the walking companion", () => {
  it("is the team's first until another is chosen, and the team is left alone", () => {
    const { token } = createProfile("Walker", 0);
    run(token, "starter", { species: "emberfox" });
    run(token, "guide");
    const p = authenticate(token);
    expect(walkingCompanion(p)?.id).toBe(p.team[0]);
    const other = p.owned.find((o) => o.id !== p.team[0])!;
    run(token, "follower", { id: other.id });
    const after = authenticate(token);
    expect(walkingCompanion(after)?.id).toBe(other.id);
    expect(after.team).toEqual(p.team);
    run(token, "follower", { id: "" });
    expect(authenticate(token).follower).toBeUndefined();
    expect(walkingCompanion(authenticate(token))?.id).toBe(p.team[0]);
  });
  it("refuses a companion that isn't the keeper's", () => {
    const { token } = createProfile("Walker Two", 0);
    run(token, "starter", { species: "emberfox" });
    expect(() => run(token, "follower", { id: "someone-else" })).toThrow("isn't yours");
  });
  it("falls back to the team's first if the chosen one is gone", () => {
    const owned = [{ id: "a", species: "emberfox" }, { id: "b", species: "mossprig" }] as never;
    expect(walkingCompanion({ owned, team: ["b"], follower: "gone" })?.id).toBe("b");
    expect(walkingCompanion({ owned, team: [], follower: undefined })?.id).toBe("a");
  });
});

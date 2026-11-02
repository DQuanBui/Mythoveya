import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HAIR_DYES, hairColor } from "../packages/shared/looks";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-looks-")), "save.sqlite");
const { createProfile, authenticate, db } = await import("../apps/server/store");
const { mutateRequest } = await import("../apps/server/routes");
const game = await import("../apps/server/game");
afterAll(() => db.close());

describe("keeper hair dyes", () => {
  it("dyes the hair, returns to natural, and refuses unknown dyes", () => {
    const p = authenticate(createProfile("Dye Keeper", 2).token);
    expect(hairColor(p)).toBeUndefined();
    game.mutate(p, "look-hair", { item: "tide" });
    expect(p.hair).toBe("tide");
    expect(hairColor(p)).toBe("#3f6f9a");
    expect(() => game.mutate(p, "look-hair", { item: "neon" })).toThrow(/hair dyes/);
    expect(p.hair).toBe("tide");
    game.mutate(p, "look-hair", { item: "natural" });
    expect("hair" in p).toBe(false);
    expect(new Set(HAIR_DYES.map((d) => d.id)).size).toBe(HAIR_DYES.length);
  });

  it("saves a dye through the API and loads saves without one", () => {
    const { token } = createProfile("Saved Dye", 0);
    expect(hairColor(authenticate(token))).toBeUndefined();
    mutateRequest(token, { kind: "look-hair", item: "petal", requestId: crypto.randomUUID() });
    expect(authenticate(token).hair).toBe("petal");
  });
});

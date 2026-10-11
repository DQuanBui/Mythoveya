import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  meadowOf,
  MEADOW_SHRINES,
  MEADOW_VERSES,
} from "../packages/shared/meadow";
import type { Profile } from "../packages/shared/types";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-meadow-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
function keeper() {
  const { token } = createProfile("Choir Keeper", 0);
  operation(token, crypto.randomUUID(), (p) => {
    mutate(p, "starter", { species: "emberfox" });
    mutate(p, "guide", {});
    mutate(p, "travel", { region: "meadow" });
  });
  return token;
}
const op = (t: string, kind: string, v = {}, id = crypto.randomUUID()) =>
  operation(t, id, (p) => mutate(p, kind, v));
it("keeps optional legacy state independent and validates journey prerequisites", () => {
  const p = {} as Profile,
    a = meadowOf(p);
  a.choirs.push("brook");
  expect(meadowOf(p).choirs).toEqual([]);
  expect(p.meadow).toBeUndefined();
  const t = keeper();
  expect(() => op(t, "mea-sing", { id: "brook", inputs: [1, 0, 2] })).toThrow(
    "Meet Rowan",
  );
  expect(authenticate(t).meadow).toBeUndefined();
  op(t, "mea-start");
  expect(() => op(t, "mea-start")).toThrow("already");
  const profile = authenticate(t);
  profile.region = "haven";
  save(profile);
  expect(() => op(t, "mea-sing")).toThrow("Travel to Whisperleaf");
});
it("rejects forged and incorrect melodies without spending or changing progress; successful requests replay once", () => {
  const t = keeper();
  op(t, "mea-start");
  const before = authenticate(t);
  for (const inputs of [[], [0, 0, 0], [1, 0, 2, 0], [-1, 0, 2], [1.5, 0, 2]])
    expect(() => op(t, "mea-sing", { id: "brook", inputs })).toThrow("harmony");
  expect(() => op(t, "mea-sing", { id: "forged", inputs: [1, 0, 2] })).toThrow(
    "Choose",
  );
  expect(authenticate(t).gold).toBe(before.gold);
  expect(authenticate(t).meadow!.choirs).toEqual([]);
  for (const s of MEADOW_SHRINES) {
    const id = crypto.randomUUID();
    const v = { id: s.id, inputs: MEADOW_VERSES[s.id].answer };
    op(t, "mea-sing", v, id);
    op(t, "mea-sing", v, id);
    expect(() => op(t, "mea-sing", v)).toThrow("already");
  }
  expect(authenticate(t).gold - before.gold).toBe(105);
  expect(authenticate(t).meadow!.choirs).toHaveLength(3);
});

import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CANYON_BEACONS, CANYON_NOTES } from "../packages/shared/canyon";
import { byId } from "../packages/shared/content";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-canyon-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const game = await import("../apps/server/game");
afterAll(() => db.close());
const op = (token: string, kind: string, v = {}, id = crypto.randomUUID()) =>
  operation(token, id, (p) => game.mutate(p, kind, v));
function keeper() {
  const { token } = createProfile("Canyon Keeper", 0);
  operation(token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.region = "canyon";
  });
  return token;
}
function tune(token: string) {
  op(token, "can-start");
  for (const n of CANYON_BEACONS) {
    const p = authenticate(token),
      o = p.owned.find((o) => byId[o.species].element === n.element)!;
    op(token, "can-tune", { quest: n.id, id: o.id, inputs: [...n.code] });
  }
}
it("validates ownership, inscriptions, quest order and replay-safe tuning", () => {
  const token = keeper(),
    before = authenticate(token);
  expect(() => op(token, "can-finish")).toThrow("sentinel");
  expect(authenticate(token).canyon).toBeUndefined();
  op(token, "can-start");
  for (const n of CANYON_BEACONS) {
    const o = before.owned.find((o) => byId[o.species].element === n.element)!;
    expect(() =>
      op(token, "can-tune", { quest: n.id, id: "forged", inputs: [...n.code] }),
    ).toThrow("owned");
    expect(() =>
      op(token, "can-tune", { quest: n.id, id: o.id, inputs: [2, 2, 2] }),
    ).toThrow("inscription");
    const request = crypto.randomUUID(),
      v = { quest: n.id, id: o.id, inputs: [...n.code] };
    op(token, "can-tune", v, request);
    op(token, "can-tune", v, request);
    expect(() => op(token, "can-tune", v)).toThrow("already tuned");
  }
  expect(authenticate(token).gold).toBe(before.gold + 120);
  expect(() => op(token, "can-finish")).toThrow("sentinel");
  const p = authenticate(token);
  p.canyon!.guardian = true;
  save(p);
  op(token, "can-finish");
  const after = authenticate(token);
  expect(after.canyon!.restored).toBe(true);
  expect(after.gold).toBe(before.gold + 340);
  expect(after.owned.some((o) => o.species === "thermala")).toBe(true);
  expect(() => op(token, "can-finish")).toThrow("already restored");
});
it("saves optional field notes, awards a badge once and rejects other regions", () => {
  const token = keeper(),
    before = authenticate(token);
  expect(() => op(token, "can-field-reward")).toThrow("three canyon");
  for (const n of CANYON_NOTES) {
    op(token, "can-note", { id: n.id });
    expect(() => op(token, "can-note", { id: n.id })).toThrow("already");
  }
  op(token, "can-field-reward");
  expect(() => op(token, "can-field-reward")).toThrow("already");
  const p = authenticate(token);
  expect(p.gold).toBe(before.gold + 45);
  expect(p.diamonds).toBe(before.diamonds + 35);
  expect(p.canyon!.fieldReward).toBe(true);
  p.region = "haven";
  save(p);
  expect(() => op(token, "can-start")).toThrow("Emberglass");
  p.region = "canyon";
  p.island = "home";
  save(p);
  expect(() => op(token, "can-start")).toThrow("Emberglass");
});

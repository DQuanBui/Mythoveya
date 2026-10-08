import { act, autoAction } from "../packages/shared/combat";
import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIELD_NODES } from "../packages/shared/wildwood";
import { DAY_CYCLE_MS } from "../packages/shared/world-time";
import { byId } from "../packages/shared/content";
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-expedition-")), "save.sqlite");
const { createProfile, operation, authenticate, save, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
function keeper() {
  const { token } = createProfile("Trail Keeper", 0);
  operation(token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" }); game.mutate(p, "guide", {});
  });
  return token;
}
const op = (token: string, kind: string, v = {}, now = 0, id = crypto.randomUUID()) => operation(token, id, (p) => game.mutate(p, kind, v, now));
it("validates field companions, persists pieces and prevents repeated rewards", () => {
  const token = keeper();
  expect(() => op(token, "exp-restore")).toThrow("three pieces");
  expect(authenticate(token).expedition).toBeUndefined();
  op(token, "exp-start");
  const before = authenticate(token);
  expect(() => op(token, "exp-field", { quest: "brazier", id: "forged" })).toThrow("owned Flame");
  expect(() => op(token, "exp-field", { quest: "forged" })).toThrow("field ability site");
  for (const n of FIELD_NODES) {
    const companion = before.owned.find((o) => byId[o.species].element === n.element)!;
    const request = crypto.randomUUID();
    op(token, "exp-field", { quest: n.id, id: companion.id }, 0, request);
    op(token, "exp-field", { quest: n.id, id: companion.id }, 0, request);
    expect(() => op(token, "exp-field", { quest: n.id, id: companion.id })).toThrow("already recovered");
  }
  const p = authenticate(token);
  expect(p.expedition!.repaired).toHaveLength(3);
  expect(p.gold).toBe(before.gold + 90);
  expect(() => op(token, "exp-restore")).toThrow("guardian");
  p.expedition!.guardian = true; save(p);
  op(token, "exp-restore");
  const after = authenticate(token);
  expect(after.expedition!.restored).toBe(true);
  expect(after.gold).toBe(before.gold + 290);
  expect(after.owned.some((o) => o.species === "galehart")).toBe(true);
  expect(() => op(token, "exp-restore")).toThrow("already restored");
});
it("validates actual server time for discoveries and keeps house stories once", () => {
  const token = keeper(), before = authenticate(token);
  expect(() => op(token, "exp-discover", { id: "starglass" }, 0)).toThrow("island time");
  op(token, "exp-discover", { id: "starglass" }, DAY_CYCLE_MS * .8);
  expect(() => op(token, "exp-discover", { id: "starglass" }, DAY_CYCLE_MS * .8)).toThrow("already recorded");
  op(token, "exp-visit", { id: "naturalist" });
  expect(() => op(token, "exp-visit", { id: "naturalist" })).toThrow("already");
  const p = authenticate(token);
  expect(p.diamonds).toBe(before.diamonds + 15);
  expect(p.gold).toBe(before.gold + 20);
  expect(p.expedition!.visits).toEqual(["naturalist"]);
});

it("requires pieces before the guardian, supports a retry and records victory once", () => {
  const token = keeper();
  expect(() => game.startPve(authenticate(token), false, false, { expedition: true })).toThrow("three windmill");
  op(token, "exp-start");
  for (const n of FIELD_NODES) {
    const o = authenticate(token).owned.find((o) => byId[o.species].element === n.element)!;
    op(token, "exp-field", { quest: n.id, id: o.id });
  }
  const lost = game.startPve(authenticate(token), false, false, { expedition: true });
  lost.winner = 1; game.finishPve(authenticate(token).id, lost);
  expect(authenticate(token).expedition!.guardian).toBe(false);
  const b = game.startPve(authenticate(token), false, false, { expedition: true });
  b.seed = 333;
  expect(b.encounter).toBe("windmill");
  for (let i = 0; i < 320 && b.winner === null; i++) {
    const a = autoAction(b);
    act(b, b.units.find((u) => u.id === b.queue[0])!.side, a.action, a.target, Date.now() + i * 10000, true);
  }
  expect(b.winner).toBe(0);
  const before = authenticate(token);
  game.finishPve(before.id, b); game.finishPve(before.id, b);
  expect(authenticate(token).expedition!.guardian).toBe(true);
  expect(authenticate(token).gold).toBe(before.gold + 80);
  expect(() => game.startPve(authenticate(token), false, false, { expedition: true })).toThrow("at peace");
});

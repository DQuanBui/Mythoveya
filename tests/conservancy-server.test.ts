import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OUTPOSTS,
  SUPPLY_NODES,
  conservancyOf,
  RECIPES,
} from "../packages/shared/conservancy";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-conservancy-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.parse("2026-10-12T12:00:00Z");
function keeper() {
  const { token } = createProfile("Conservator", 0);
  operation(token, crypto.randomUUID(), (p) => {
    mutate(p, "starter", { species: "emberfox" });
    mutate(p, "guide", {});
  });
  return token;
}
const op = (
  t: string,
  kind: string,
  v: object = {},
  time = now,
  id = crypto.randomUUID(),
) => operation(t, id, (p) => mutate(p, kind, v, time));
function region(t: string, id: string) {
  const p = authenticate(t);
  p.region = id;
  save(p);
}
function gather(t: string, time = now) {
  for (const n of SUPPLY_NODES.filter(
    (n) => n.region === authenticate(t).region,
  ))
    op(
      t,
      "cons-gather",
      { id: n.id, quest: new Date(time).toISOString().slice(0, 10) },
      time,
    );
}
it("gathers only local daily supplies, saves the bag and replays without duplicating materials", () => {
  const t = keeper(),
    n = SUPPLY_NODES[0],
    v = { id: n.id, quest: "2026-10-12" };
  expect(() => op(t, "cons-gather", { ...v, id: SUPPLY_NODES[3].id })).toThrow(
    "region",
  );
  expect(() => op(t, "cons-gather", { ...v, quest: "2026-10-11" })).toThrow(
    "day changed",
  );
  const id = crypto.randomUUID();
  op(t, "cons-gather", v, now, id);
  op(t, "cons-gather", v, now, id);
  expect(authenticate(t).conservancy!.materials.timber).toBe(3);
  expect(() => op(t, "cons-gather", v)).toThrow("replenishes");
  op(t, "cons-gather", { ...v, quest: "2026-10-13" }, now + 86400000);
  expect(authenticate(t).conservancy!.materials.timber).toBe(6);
  expect(authenticate(t).conservancy!.gathered).toEqual([n.id]);
  const p = authenticate(t);
  p.island = "home";
  save(p);
  expect(() => op(t, "cons-gather", v)).toThrow("mainland");
});
it("keeps old profiles compatible and can gather one full set in every region", () => {
  const t = keeper();
  expect(conservancyOf(authenticate(t), now).materials).toEqual({
    timber: 0,
    fiber: 0,
    crystal: 0,
  });
  for (const h of OUTPOSTS) {
    region(t, h.region);
    gather(t);
  }
  expect(authenticate(t).conservancy!.materials).toEqual({
    timber: 12,
    fiber: 12,
    crystal: 12,
  });
});

it("crafts exact recipes and dismantles spares without losing or duplicating materials", () => {
  const t = keeper();
  expect(() => op(t, "cons-craft", { item: "shelter" })).toThrow("missing");
  gather(t);
  const before = authenticate(t).conservancy!.materials;
  expect(() => op(t, "cons-craft", { item: "forged" })).toThrow("blueprint");
  for (const k of RECIPES) {
    const id = crypto.randomUUID();
    op(t, "cons-craft", { item: k.id }, now, id);
    op(t, "cons-craft", { item: k.id }, now, id);
  }
  expect(authenticate(t).conservancy!.materials).toEqual({
    timber: 0,
    fiber: 0,
    crystal: 0,
  });
  expect(authenticate(t).conservancy!.kits).toEqual({
    shelter: 1,
    planter: 1,
    lantern: 1,
  });
  for (const k of RECIPES) op(t, "cons-dismantle", { item: k.id });
  expect(authenticate(t).conservancy!.materials).toEqual(before);
  expect(() => op(t, "cons-dismantle", { item: "shelter" })).toThrow(
    "no spare",
  );
});

it("restores all four outposts with saved pieces and one-time milestone companions", () => {
  const t = keeper();
  expect(() => op(t, "cons-claim", { id: "astralynx" })).toThrow("Restore 4");
  for (const h of OUTPOSTS) {
    region(t, h.region);
    expect(() => op(t, "cons-tend", { id: h.id, quest: "2026-10-12" })).toThrow(
      "Restore",
    );
    gather(t);
    for (const k of RECIPES) {
      op(t, "cons-craft", { item: k.id });
      const id = crypto.randomUUID();
      expect(() =>
        op(t, "cons-install", { id: "cons-invalid", item: k.id }),
      ).toThrow("region");
      op(t, "cons-install", { id: h.id, item: k.id }, now, id);
      op(t, "cons-install", { id: h.id, item: k.id }, now, id);
      expect(() => op(t, "cons-install", { id: h.id, item: k.id })).toThrow(
        "already",
      );
    }
  }
  expect(() => op(t, "cons-claim", { id: "astralynx" })).toThrow("Juniper");
  region(t, "haven");
  const before = authenticate(t);
  for (const id of ["mossloom", "astralynx"]) {
    const req = crypto.randomUUID();
    op(t, "cons-claim", { id }, now, req);
    op(t, "cons-claim", { id }, now, req);
    expect(() => op(t, "cons-claim", { id })).toThrow("already");
  }
  const after = authenticate(t);
  expect(after.diamonds - before.diamonds).toBe(230 + 50 * (after.level - before.level));
  expect(
    after.owned.filter((o) => ["mossloom", "astralynx"].includes(o.species)),
  ).toHaveLength(2);
  const next = now + 86400000;
  gather(t, next);
  op(t, "cons-craft", { item: "planter" }, next);
  const gold = authenticate(t).gold;
  op(t, "cons-tend", { id: "cons-haven", quest: "2026-10-13" }, next);
  expect(authenticate(t).gold - gold).toBe(25);
  expect(() =>
    op(t, "cons-tend", { id: "cons-haven", quest: "2026-10-13" }, next),
  ).toThrow("already");
  expect(authenticate(t).conservancy!.installed.haven).toHaveLength(3);
  expect(authenticate(t).conservancy!.claims).toHaveLength(2);
});

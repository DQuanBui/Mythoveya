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

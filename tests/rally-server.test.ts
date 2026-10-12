import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RALLY_HOSTS, rallyActivity } from "../packages/shared/rally";
import { byId } from "../packages/shared/content";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-rally-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
const day = Date.parse("2026-10-11T12:00:00Z");
function keeper() {
  const { token } = createProfile("Wayfarer", 0);
  operation(token, crypto.randomUUID(), (p) => {
    mutate(p, "starter", { species: "emberfox" });
    mutate(p, "guide", {});
  });
  return token;
}
const op = (
  t: string,
  v: object,
  now = day,
  id = crypto.randomUUID(),
  kind = "rally-complete",
) => operation(t, id, (p) => mutate(p, kind, v, now));
function payload(t: string, now = day) {
  const p = authenticate(t),
    h = RALLY_HOSTS.find((h) => h.region === p.region)!,
    a = rallyActivity(p.region, now);
  return {
    quest: a.day,
    item: a.kind,
    id: p.owned.find((o) => byId[o.species].element === h.element)?.id,
    inputs: a.kind === "survey" ? [h.answer] : a.signal,
  };
}
it("validates daily answers and stale requests without spending, then persists first stamps and companions", () => {
  const t = keeper();
  for (const h of RALLY_HOSTS) {
    const p = authenticate(t);
    p.region = h.region;
    save(p);
    const a = payload(t),
      before = authenticate(t);
    expect(() => op(t, { ...a, quest: "1999-01-01" })).toThrow("changed");
    expect(() => op(t, { ...a, id: "forged", inputs: [99] })).toThrow();
    expect(authenticate(t).gold).toBe(before.gold);
    const id = crypto.randomUUID();
    op(t, a, day, id);
    op(t, a, day, id);
    const after = authenticate(t);
    expect(after.gold - before.gold).toBe(40);
    expect(after.rally!.stamps).toContain(h.region);
    expect(after.owned.some((o) => o.species === h.species)).toBe(true);
    expect(() => op(t, a)).toThrow("already complete");
  }
  expect(authenticate(t).rally!.stamps).toHaveLength(4);
});
it("resets daily jobs across midnight but never regrants first-visit companions", () => {
  const t = keeper();
  op(t, payload(t));
  const p = authenticate(t),
    o = p.owned.find((o) => o.species === "sunquill")!;
  const next = day + 86400000;
  op(t, payload(t, next), next);
  const after = authenticate(t);
  expect(after.rally!.stamps).toEqual(["haven"]);
  expect(after.rally!.completed).toEqual(["haven"]);
  expect(after.owned.find((a) => a.id === o.id)!.shards).toBe(o.shards);
  const q = authenticate(t);
  q.island = "home";
  save(q);
  expect(() => op(t, payload(t, next), next)).toThrow("regional");
});

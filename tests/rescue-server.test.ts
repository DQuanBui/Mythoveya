import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RESCUES,
  FIELD_ABILITIES,
  rescueOf,
  rescueCount,
  fieldAbility,
} from "../packages/shared/rescue";
import { byId, STARTERS } from "../packages/shared/content";
import { own } from "../packages/shared/economy";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-rescue-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
function keeper(starter = "emberfox") {
  const { token } = createProfile("Rescue Keeper", 0);
  operation(token, crypto.randomUUID(), (p) => {
    mutate(p, "starter", { species: starter });
    mutate(p, "guide", {});
  });
  return token;
}
const op = (
  t: string,
  kind: string,
  v: object = {},
  id = crypto.randomUUID(),
) => operation(t, id, (p) => mutate(p, kind, v));
function region(t: string, r: string) {
  const p = authenticate(t);
  p.region = r;
  save(p);
}
function help(
  t: string,
  s: (typeof RESCUES)[number],
  i: number,
  id = crypto.randomUUID(),
) {
  const p = authenticate(t),
    o = p.owned.find(
      (o) =>
        p.team.includes(o.id) &&
        fieldAbility(byId[o.species].element) === s.steps[i].ability,
    )!;
  op(t, "rescue-help", { id: s.id, companion: o.id, inputs: [i] }, id);
  return o.id;
}
function finish(t: string, s: (typeof RESCUES)[number], outcome = "shelter") {
  region(t, s.region);
  op(t, "rescue-survey", { id: s.id });
  s.steps.forEach((_, i) => help(t, s, i));
  op(t, "rescue-finish", { id: s.id, quest: outcome });
}
it("supports old saves and every starter team without consuming field resources", () => {
  for (const starter of STARTERS) {
    const t = keeper(starter),
      p = authenticate(t);
    expect(rescueOf(p)).toEqual({ sites: {}, claims: [] });
    expect(p.rescue).toBeUndefined();
    for (const ability of Object.keys(FIELD_ABILITIES))
      expect(
        p.owned.some(
          (o) =>
            p.team.includes(o.id) &&
            fieldAbility(byId[o.species].element) === ability,
        ),
      ).toBe(true);
    const s = RESCUES[0];
    op(t, "rescue-survey", { id: s.id });
    help(t, s, 0);
    const after = authenticate(t);
    expect(after.gold).toBe(p.gold);
    expect(after.diamonds).toBe(p.diamonds);
    expect(after.town!.inventory).toEqual(p.town!.inventory);
  }
});
it("rejects wrong sites, islands, inactive helpers and stale task indices without changing progress", () => {
  const t = keeper(),
    s = RESCUES[0];
  expect(() => op(t, "rescue-survey", { id: RESCUES[1].id })).toThrow(
    "mainland",
  );
  expect(() => op(t, "rescue-help", { id: s.id, inputs: [0] })).toThrow(
    "Survey",
  );
  let p = authenticate(t);
  p.island = "home";
  save(p);
  expect(() => op(t, "rescue-survey", { id: s.id })).toThrow("mainland");
  delete p.island;
  save(p);
  op(t, "rescue-survey", { id: s.id });
  expect(() => op(t, "rescue-survey", { id: s.id })).toThrow("already");
  p = authenticate(t);
  own(p, "cairnfin", () => 1);
  save(p);
  const before = authenticate(t);
  expect(() =>
    op(t, "rescue-help", {
      id: s.id,
      companion: p.owned.find((o) => o.species === "cairnfin")!.id,
      inputs: [0],
    }),
  ).toThrow("active team");
  expect(() =>
    op(t, "rescue-help", { id: s.id, companion: p.team[0], inputs: [0] }),
  ).toThrow("different field ability");
  expect(() =>
    op(t, "rescue-help", { id: s.id, companion: p.team[0], inputs: [1] }),
  ).toThrow("task changed");
  expect(authenticate(t)).toEqual(before);
  expect(() => op(t, "rescue-finish", { id: s.id, quest: "shelter" })).toThrow(
    "three",
  );
  const req = crypto.randomUUID(),
    helper = help(t, s, 0, req),
    saved = authenticate(t);
  op(t, "rescue-help", { id: s.id, companion: helper, inputs: [0] }, req);
  expect(authenticate(t)).toEqual(saved);
  expect(() =>
    op(t, "rescue-help", { id: s.id, companion: helper, inputs: [0] }),
  ).toThrow("task changed");
});
it("saves both endings, caps friendship and gives each site reward only once", () => {
  const t = keeper();
  let p = authenticate(t);
  p.owned.forEach((o) => (o.friendship = 99));
  save(p);
  for (const [i, s] of RESCUES.entries()) {
    region(t, s.region);
    op(t, "rescue-survey", { id: s.id });
    s.steps.forEach((_, n) => help(t, s, n));
    expect(() =>
      op(t, "rescue-finish", { id: s.id, quest: "invalid" }),
    ).toThrow("Choose");
    const before = authenticate(t),
      req = crypto.randomUUID(),
      v = { id: s.id, quest: i % 2 ? "wild" : "shelter" };
    op(t, "rescue-finish", v, req);
    const saved = authenticate(t);
    expect(saved.gold - before.gold).toBe(70);
    expect(saved.rescue!.sites[s.region].outcome).toBe(v.quest);
    expect(saved.rescue!.sites[s.region].helpers).toHaveLength(3);
    op(t, "rescue-finish", v, req);
    expect(authenticate(t)).toEqual(saved);
    expect(() => op(t, "rescue-finish", v)).toThrow("already");
    expect(() => help(t, s, 0)).toThrow("already");
  }
  p = authenticate(t);
  expect(rescueCount(p)).toBe(4);
  expect(p.owned.every((o) => (o.friendship || 0) <= 100)).toBe(true);
});
it("protects milestone claims and preserves duplicate appearance and earlier progress", () => {
  const t = keeper(),
    s = RESCUES[0];
  expect(() =>
    op(t, "rescue-claim", { id: s.id, species: "reedrake" }),
  ).toThrow("2 rescues");
  finish(t, RESCUES[3]);
  finish(t, RESCUES[1], "wild");
  let p = authenticate(t);
  own(p, "reedrake", () => 0);
  save(p);
  const original = authenticate(t).owned.find((o) => o.species === "reedrake")!;
  const req = crypto.randomUUID(),
    v = { id: RESCUES[1].id, species: "reedrake" };
  op(t, "rescue-claim", v, req);
  const saved = authenticate(t);
  op(t, "rescue-claim", v, req);
  expect(authenticate(t)).toEqual(saved);
  const duplicate = saved.owned.find((o) => o.species === "reedrake")!;
  expect(duplicate.shards).toBe(original.shards + 1);
  expect(duplicate.shimmer).toBe(true);
  expect(() => op(t, "rescue-claim", v)).toThrow("already");
  expect(() => op(t, "rescue-claim", { ...v, species: "solmole" })).toThrow(
    "4 rescues",
  );
  finish(t, RESCUES[0]);
  finish(t, RESCUES[2]);
  op(t, "rescue-claim", { id: RESCUES[2].id, species: "solmole" });
  p = authenticate(t);
  expect(p.rescue!.claims).toEqual(["reedrake", "solmole"]);
  expect(p.owned.filter((o) => o.species === "solmole")).toHaveLength(1);
  expect(rescueCount(p)).toBe(4);
  expect(() =>
    op(t, "rescue-claim", { id: RESCUES[2].id, species: "missing" }),
  ).toThrow("Unknown");
});

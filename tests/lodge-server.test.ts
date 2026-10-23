import { afterAll, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LODGES,
  lodgeOf,
  lodgeRecord,
  lodgeCount,
} from "../packages/shared/lodges";
import { STARTERS, byId } from "../packages/shared/content";
import { fieldAbility } from "../packages/shared/rescue";
import { conservancyOf, type Material } from "../packages/shared/conservancy";
import { LODGE_WORKSHOPS, lodgeWorkshopCount } from "../packages/shared/lodge-workshops";
process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-lodges-")),
  "save.sqlite",
);
const { createProfile, operation, authenticate, save, db } = await import(
  "../apps/server/store"
);
const { mutate } = await import("../apps/server/game");
afterAll(() => db.close());
const op = (
  token: string,
  kind: string,
  v: object = {},
  id = crypto.randomUUID(),
) => operation(token, id, (p) => mutate(p, kind, v));
function keeper(starter = "emberfox") {
  const { token } = createProfile("Lodge Keeper", 0);
  op(token, "starter", { species: starter });
  op(token, "guide");
  return token;
}
function region(t: string, r: string) {
  const p = authenticate(t);
  p.region = r;
  save(p);
}
function helping(t: string, s: (typeof LODGES)[number]) {
  const p = authenticate(t);
  return p.owned.find(
    (o) =>
      p.team.includes(o.id) &&
      fieldAbility(byId[o.species].element) === s.ability,
  )!;
}
function finish(t: string, s: (typeof LODGES)[number], choice = "lantern") {
  region(t, s.region);
  op(t, "lodge-meet", { id: s.id });
  op(t, "lodge-cook", { id: s.id, inputs: [s.answer] });
  op(t, "lodge-help", { id: s.id, companion: helping(t, s).id });
  op(t, "lodge-finish", { id: s.id, quest: choice });
}
it("crafts four permanent displays with exact material costs and replay-safe saves", () => {
  const t = keeper();
  for (const s of LODGES) {
    finish(t, s);
    const before = authenticate(t);
    const supplies = structuredClone(conservancyOf(before));
    supplies.materials = { timber: 9, fiber: 9, crystal: 9 };
    before.conservancy = supplies;
    save(before);
    const id = crypto.randomUUID();
    op(t, "lodge-workshop", { id: s.id }, id);
    const after = authenticate(t);
    for (const m of ["timber", "fiber", "crystal"] as Material[])
      expect(after.conservancy!.materials[m]).toBe(9 - (LODGE_WORKSHOPS[s.region].cost[m] || 0));
    expect(after.gold).toBe(before.gold);
    expect(after.diamonds).toBe(before.diamonds);
    expect(after.owned).toEqual(before.owned);
    op(t, "lodge-workshop", { id: s.id }, id);
    expect(authenticate(t)).toEqual(after);
    expect(() => op(t, "lodge-workshop", { id: s.id })).toThrow(/already/);
    expect(authenticate(t)).toEqual(after);
    const decorate = crypto.randomUUID();
    op(t, "lodge-decorate", { id: s.id, quest: "banner" }, decorate);
    const changed = authenticate(t);
    expect(lodgeRecord(changed, s.region)).toEqual({ ...lodgeRecord(after, s.region), keepsake: "banner" });
    expect(changed.gold).toBe(after.gold);
    expect(changed.conservancy).toEqual(after.conservancy);
    op(t, "lodge-decorate", { id: s.id, quest: "banner" }, decorate);
    expect(authenticate(t)).toEqual(changed);
  }
  expect(lodgeWorkshopCount(authenticate(t))).toBe(4);
});
it("rejects locked workshops missing materials foreign regions and invalid decoration choices atomically", () => {
  const t = keeper(), s = LODGES[0];
  const rejected = (kind: string, data: object) => {
    const before = authenticate(t);
    expect(() => op(t, kind, data)).toThrow();
    expect(authenticate(t)).toEqual(before);
  };
  rejected("lodge-workshop", { id: s.id });
  rejected("lodge-decorate", { id: s.id, quest: "banner" });
  finish(t, s);
  rejected("lodge-workshop", { id: s.id });
  rejected("lodge-workshop", { id: LODGES[1].id });
  rejected("lodge-decorate", { id: s.id, quest: "gold" });
  rejected("lodge-decorate", { id: s.id, quest: "lantern" });
  const p = authenticate(t);
  p.conservancy = structuredClone(conservancyOf(p));
  p.conservancy.materials = { timber: 2, fiber: 0, crystal: 99 };
  save(p);
  rejected("lodge-workshop", { id: s.id });
  p.island = "home"; save(p);
  rejected("lodge-decorate", { id: s.id, quest: "banner" });
});
it("supports legacy saves and every starter through four gatherings without inventory costs", () => {
  for (const starter of STARTERS) {
    const t = keeper(starter),
      before = authenticate(t),
      gold = before.gold,
      diamonds = before.diamonds,
      inventory = structuredClone(before.town?.inventory);
    expect(lodgeOf(before)).toEqual({ rooms: {}, claims: [] });
    LODGES.forEach((s, i) => finish(t, s, i % 2 ? "banner" : "lantern"));
    const p = authenticate(t);
    expect(lodgeCount(p)).toBe(4);
    expect(p.gold).toBe(gold + 200);
    expect(p.diamonds).toBeGreaterThanOrEqual(diamonds + 60);
    expect(p.town?.inventory).toEqual(inventory);
    for (const [i, s] of LODGES.entries()) {
      const r = lodgeRecord(p, s.region);
      expect(r.meal).toBe(s.recipe);
      expect(r.keepsake).toBe(i % 2 ? "banner" : "lantern");
      expect(p.owned.find((o) => o.id === r.helper!.id)!.friendship).toBe(3);
    }
  }
});
it("rejects wrong regions islands missing prerequisites and unknown recipes without mutations", () => {
  const t = keeper(),
    s = LODGES[0];
  const unchanged = (kind: string, v: object) => {
    const p = authenticate(t);
    expect(() => op(t, kind, v)).toThrow();
    expect(authenticate(t)).toEqual(p);
  };
  unchanged("lodge-meet", { id: LODGES[1].id });
  unchanged("lodge-cook", { id: s.id, inputs: [s.answer] });
  unchanged("lodge-claim", { id: s.id, species: "lumeswallow" });
  op(t, "lodge-meet", { id: s.id });
  unchanged("lodge-meet", { id: s.id });
  unchanged("lodge-cook", { id: s.id, inputs: [99] });
  unchanged("lodge-cook", { id: s.id, inputs: [s.answer, 0] });
  unchanged("lodge-finish", { id: s.id, quest: "banner" });
  unchanged("lodge-help", { id: s.id, companion: "foreign" });
  const wrong = authenticate(t).owned.find(
    (o) => fieldAbility(byId[o.species].element) !== s.ability,
  )!;
  unchanged("lodge-help", { id: s.id, companion: wrong.id });
  const p = authenticate(t);
  p.island = "home";
  save(p);
  unchanged("lodge-cook", { id: s.id, inputs: [s.answer] });
});
it("rejects benched helpers caps friendship and preserves the original helper species", () => {
  const t = keeper(),
    s = LODGES[0];
  op(t, "lodge-meet", { id: s.id });
  const o = helping(t, s),
    p = authenticate(t);
  p.owned.find((c) => c.id === o.id)!.friendship = 99;
  p.team = p.team.filter((id) => id !== o.id);
  save(p);
  expect(() => op(t, "lodge-help", { id: s.id, companion: o.id })).toThrow(
    /active companion/,
  );
  p.team.push(o.id);
  save(p);
  op(t, "lodge-help", { id: s.id, companion: o.id });
  const after = authenticate(t);
  expect(after.owned.find((c) => c.id === o.id)!.friendship).toBe(100);
  expect(lodgeRecord(after, s.region).helper).toEqual({
    id: o.id,
    species: o.species,
  });
});
it("replays requests safely and prevents duplicate rewards with new request IDs", () => {
  const t = keeper(),
    s = LODGES[0];
  op(t, "lodge-meet", { id: s.id });
  op(t, "lodge-cook", { id: s.id, inputs: [s.answer] });
  op(t, "lodge-help", { id: s.id, companion: helping(t, s).id });
  const before = authenticate(t),
    id = crypto.randomUUID();
  op(t, "lodge-finish", { id: s.id, quest: "banner" }, id);
  const after = authenticate(t);
  op(t, "lodge-finish", { id: s.id, quest: "banner" }, id);
  expect(authenticate(t)).toEqual(after);
  expect(after.gold).toBe(before.gold + 50);
  for (const kind of ["lodge-finish", "lodge-cook", "lodge-help"])
    expect(() =>
      op(t, kind, {
        id: s.id,
        quest: "lantern",
        inputs: [s.answer],
        companion: helping(t, s).id,
      }),
    ).toThrow();
  expect(authenticate(t)).toEqual(after);
});
it("unlocks lodge companions once at two and four gatherings and persists across sessions", () => {
  const t = keeper();
  LODGES.slice(0, 2).forEach((s) => finish(t, s));
  let s = LODGES[1];
  op(t, "lodge-claim", { id: s.id, species: "lumeswallow" });
  expect(() =>
    op(t, "lodge-claim", { id: s.id, species: "velvetmoth" }),
  ).toThrow(/4/);
  LODGES.slice(2).forEach((s) => finish(t, s));
  s = LODGES[3];
  const request = crypto.randomUUID();
  op(t, "lodge-claim", { id: s.id, species: "velvetmoth" }, request);
  const saved = authenticate(t);
  op(t, "lodge-claim", { id: s.id, species: "velvetmoth" }, request);
  expect(authenticate(t)).toEqual(saved);
  expect(
    saved.owned.filter((o) =>
      ["lumeswallow", "velvetmoth"].includes(o.species),
    ),
  ).toHaveLength(2);
  expect(saved.lodges?.claims).toEqual(["lumeswallow", "velvetmoth"]);
  expect(() =>
    op(t, "lodge-claim", { id: s.id, species: "velvetmoth" }),
  ).toThrow(/already/);
  expect(() =>
    op(t, "lodge-claim", { id: s.id, species: "solkarath" }),
  ).toThrow(/Unknown/);
});

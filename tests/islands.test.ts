import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { islandMutation } from "../apps/server/island-game";
import {
  CATALOG,
  HABITAT_STORAGE_HOURS,
  catalogEntry,
  defaultHome,
  homeWalkable,
  islandArrival,
  placementError,
  homeRadius,
} from "../packages/shared/islands";
import { SKYFERRY, havenWalkable, pathDistance } from "../packages/shared/haven";
import { buildGrid, findPath } from "../packages/shared/pathfind";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-islands-")), "save.sqlite");
const { createProfile, authenticate, operation, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.UTC(2026, 9, 3, 10);
const act = (token: string, kind: string, v: Record<string, unknown> = {}, at = now) =>
  operation(token, crypto.randomUUID(), (p) => islandMutation(p, kind, v, at)).value;
function keeper(gold = 20000) {
  const g = createProfile("Isle Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.gold = gold;
    p.level = 30;
  });
  return g.token;
}

describe("Skyferry travel", () => {
  it("unlocks the home island after a starter and always returns to Havenreach", () => {
    const fresh = createProfile("No Starter", 0);
    expect(() => act(fresh.token, "island-travel", { region: "home" })).toThrow("first companion");
    const token = keeper();
    act(token, "island-travel", { region: "home" });
    let p = authenticate(token);
    expect(p.island).toBe("home");
    expect(p.region).toBe("haven");
    expect(p.home?.expansion).toBe(0);
    expect(() => act(token, "island-travel", { region: "nowhere" })).toThrow("does not sail");
    act(token, "island-travel", { region: "haven" });
    p = authenticate(token);
    expect(p.island).toBeUndefined();
    expect(p.region).toBe("haven");
  });
  it("leaves the island when travelling to another region", () => {
    const token = keeper();
    act(token, "island-travel", { region: "home" });
    operation(token, crypto.randomUUID(), (p) => {
      p.wins = 10;
      game.mutate(p, "travel", { region: "haven" });
    });
    expect(authenticate(token).island).toBeUndefined();
  });
  it("puts the Havenreach dock on a reachable trail", () => {
    const [x, z] = SKYFERRY.point;
    expect(havenWalkable(x, z)).toBe(true);
    expect(pathDistance(x, z)).toBeLessThan(1);
    const grid = buildGrid(havenWalkable, 78);
    expect(findPath(grid, [0, 5], [x, z], havenWalkable)?.length).toBeGreaterThan(0);
  });
});

describe("Home island building", () => {
  it("validates placement, saves the layout and reloads it", () => {
    const token = keeper();
    act(token, "island-travel", { region: "home" });
    expect(() => act(token, "home-place", { item: "oak", x: 0, z: 0, rot: 0 })).toThrow("house");
    expect(() => act(token, "home-place", { item: "oak", x: -9, z: 0, rot: 0 })).toThrow("dock path");
    expect(() => act(token, "home-place", { item: "oak", x: 13.5, z: 0, rot: 0 })).toThrow("edge");
    expect(() => act(token, "home-place", { item: "pond", x: 7, z: 7, rot: 0 })).toThrow("Porch cottage");
    expect(() => act(token, "home-place", { item: "made-up", x: 7, z: 7, rot: 0 })).toThrow("catalog");
    const { uid } = act(token, "home-place", { item: "oak", x: 7.2, z: -6.9, rot: 0 });
    expect(() => act(token, "home-place", { item: "rocks", x: 7.5, z: -6.5, rot: 0 })).toThrow("already there");
    act(token, "home-move", { id: uid, x: -7, z: -7, rot: 1 });
    let p = authenticate(token);
    expect(p.home!.items).toEqual([{ uid, kind: "oak", x: -7, z: -7, rot: 1 }]);
    expect(p.gold).toBe(20000 - 60);
    // Walkability follows the layout: the tree blocks its own cell.
    expect(homeWalkable(p.home!, -7, -7)).toBe(false);
    expect(homeWalkable(p.home!, -7, 7)).toBe(true);
    act(token, "home-remove", { id: uid });
    p = authenticate(token);
    expect(p.home!.items).toHaveLength(0);
    expect(p.gold).toBe(20000 - 60 + 30);
  });
  it("limits pieces by house level and upgrades the house and land", () => {
    const token = keeper(100000);
    act(token, "island-travel", { region: "home" });
    act(token, "home-place", { item: "habitat-flame", x: -8, z: 6, rot: 0 });
    act(token, "home-place", { item: "habitat-tide", x: 8, z: 0, rot: 0 });
    expect(() => act(token, "home-place", { item: "habitat-grove", x: 0, z: -9, rot: 0 })).toThrow("no more habitats");
    act(token, "home-house");
    act(token, "home-place", { item: "habitat-grove", x: 0, z: -9, rot: 0 });
    act(token, "home-expand");
    const p = authenticate(token);
    expect(p.home!.house).toBe(1);
    expect(homeRadius(p.home!)).toBe(18);
    expect(p.gold).toBe(100000 - 500 * 3 - 800 - 600);
    operation(token, crypto.randomUUID(), (q) => (q.level = 1));
    expect(() => act(token, "home-house")).toThrow("level");
  });
  it("lets companions live in habitats and pays capped Gold over time", () => {
    const token = keeper();
    act(token, "island-travel", { region: "home" });
    const { uid } = act(token, "home-place", { item: "habitat-flame", x: -8, z: 6, rot: 0 });
    const p0 = authenticate(token),
      [a, b] = p0.owned;
    expect(() => act(token, "home-collect")).toThrow("nothing stored");
    act(token, "home-assign", { quest: uid, id: a.id });
    act(token, "home-assign", { quest: uid, id: b.id });
    expect(() => act(token, "home-assign", { quest: uid, id: a.id })).toThrow("already lives");
    const gold = authenticate(token).gold;
    const later = now + 24 * 3600000;
    const { gold: earned } = act(token, "home-collect", {}, later);
    expect(earned).toBeGreaterThan(0);
    // A full day still only pays the storage cap.
    const p = authenticate(token);
    expect(p.gold - gold).toBe(earned);
    expect(earned).toBeLessThanOrEqual(2 * 30 * HABITAT_STORAGE_HOURS);
    // Greeting raises friendship once a day.
    const before = p.owned.find((o) => o.id === a.id)!.friendship || 0;
    act(token, "home-pet", { id: a.id }, later);
    act(token, "home-pet", { id: a.id }, later);
    expect(authenticate(token).owned.find((o) => o.id === a.id)!.friendship).toBe(before + 2);
    act(token, "home-unassign", { id: a.id }, later);
    expect(authenticate(token).home!.residents[uid]).toEqual([b.id]);
  });
  it("keeps the arrival point and dock walkway clear at every size", () => {
    const home = defaultHome();
    for (let e = 0; e < 5; e++) {
      home.expansion = e;
      const [x, z] = islandArrival("home", homeRadius(home));
      expect(homeWalkable(home, x, z)).toBe(true);
      for (const c of CATALOG) expect(placementError(home, c, x, z, 0)).toBeTruthy();
    }
    expect(catalogEntry("habitat-light")?.element).toBe("Light");
  });
});

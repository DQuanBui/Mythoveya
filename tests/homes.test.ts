import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HAVEN_HOUSES } from "../packages/shared/haven";
import { LODGES } from "../packages/shared/lodges";
import { NPCS } from "../packages/shared/town";
import { byId } from "../packages/shared/content";
import { HOME_INTERIORS, HOME_SPAWN, HOME_STATIONS, homeWalkable, homeResidentRoute } from "../packages/shared/homes";
import { buildGrid, findPath } from "../packages/shared/pathfind";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-homes-")), "save.sqlite");
const { createProfile, authenticate, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());

describe("visitor-book home interiors", () => {
  it("gives every visitor-book home an interior or its lodge, with real hosts and residents", () => {
    for (const h of HAVEN_HOUSES) {
      const lodge = LODGES.some((l) => l.region === "haven" && Math.hypot(l.point[0] - h.point[0], l.point[1] - h.point[1]) < 5);
      expect(!!HOME_INTERIORS[h.id] !== lodge, h.id).toBe(true);
    }
    for (const home of Object.values(HOME_INTERIORS)) {
      expect(byId[home.species], home.species).toBeTruthy();
      expect(home.lines.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(home.gift).length).toBeGreaterThan(0);
    }
    expect(NPCS.some((n) => n.name === HOME_INTERIORS.glasshouse.host)).toBe(true);
  });

  it("lets the keeper walk from the door to every station", () => {
    const grid = buildGrid(homeWalkable, 6);
    expect(homeWalkable(...HOME_SPAWN)).toBe(true);
    expect(homeResidentRoute().length).toBeGreaterThan(4);
    for (const p of homeResidentRoute()) expect(homeWalkable(...p), String(p)).toBe(true);
    for (const s of HOME_STATIONS) {
      expect(homeWalkable(...s.point), s.id).toBe(true);
      expect(findPath(grid, HOME_SPAWN, s.point, homeWalkable), s.id).toBeTruthy();
    }
  });

  it("hands out each home's gift once per UTC day", () => {
    const p = authenticate(createProfile("Gift Keeper", 0).token),
      day = Date.parse("2026-10-29T10:00:00Z");
    p.region = "haven";
    const gold = p.gold;
    game.mutate(p, "town-gift", { id: "workshop" }, day);
    expect(p.gold).toBe(gold + 30);
    expect(() => game.mutate(p, "town-gift", { id: "workshop" }, day)).toThrow(/nothing more/);
    game.mutate(p, "town-gift", { id: "glasshouse" }, day);
    expect(p.town!.inventory.sunseed).toBeGreaterThanOrEqual(2);
    expect(() => game.mutate(p, "town-gift", { id: "ranger-lodge" }, day)).toThrow(/Visit a home/);
    expect(() => game.mutate(p, "town-gift", { id: "constructor" }, day)).toThrow(/Visit a home/);
    p.region = "canyon";
    expect(() => game.mutate(p, "town-gift", { id: "bakery" }, day)).toThrow(/Visit a home/);
  });
});

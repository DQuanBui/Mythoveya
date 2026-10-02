import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { festivalMutation } from "../apps/server/festival-game";
import { islandMutation } from "../apps/server/island-game";
import { townMutation } from "../apps/server/town-game";
import {
  FESTIVAL_RADIUS,
  FESTIVAL_SHOP,
  HUNT_SPOTS,
  festivalWalkable,
  huntSpots,
} from "../packages/shared/festival";
import { islandArrival } from "../packages/shared/islands";
import { buildGrid, findPath } from "../packages/shared/pathfind";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-festival-")), "save.sqlite");
const { createProfile, authenticate, operation, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.UTC(2026, 9, 3, 10);
const fest = (token: string, kind: string, v: Record<string, unknown> = {}, at = now) =>
  operation(token, crypto.randomUUID(), (p) => festivalMutation(p, kind, v, at)).value;
const island = (token: string, kind: string, v: Record<string, unknown> = {}) =>
  operation(token, crypto.randomUUID(), (p) => islandMutation(p, kind, v, now)).value;
function keeper(tickets = 0, wins = 1) {
  const g = createProfile("Fair Goer", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.wins = wins;
  });
  if (tickets)
    operation(g.token, crypto.randomUUID(), (p) => {
      festivalMutation(p, "fest-outfit", { item: "none" }, now);
      p.festival!.tickets = tickets;
    });
  return g.token;
}

describe("Lanternfair Isle", () => {
  it("opens after the first win and welcomes visitors once a day", () => {
    const early = keeper(0, 0);
    expect(() => island(early, "island-travel", { region: "festival" })).toThrow("first battle");
    const token = keeper();
    expect(() => fest(token, "fest-greet")).toThrow("Visit Lanternfair");
    island(token, "island-travel", { region: "festival" });
    expect(authenticate(token).island).toBe("festival");
    fest(token, "fest-greet");
    expect(() => fest(token, "fest-greet")).toThrow("already");
    expect(authenticate(token).festival!.tickets).toBe(2);
    fest(token, "fest-greet", {}, now + 86400000);
    expect(authenticate(token).festival!.tickets).toBe(4);
  });
  it("hides five reachable lanterns a day and pays a bonus for all five", () => {
    const token = keeper();
    island(token, "island-travel", { region: "festival" });
    const spots = huntSpots("2026-10-03");
    expect(spots).toHaveLength(5);
    expect(new Set(spots.map((s) => s.id)).size).toBe(5);
    expect(huntSpots("2026-10-04").map((s) => s.id)).not.toEqual(spots.map((s) => s.id));
    const grid = buildGrid(festivalWalkable, FESTIVAL_RADIUS + 2),
      start = islandArrival("festival", FESTIVAL_RADIUS);
    for (const s of HUNT_SPOTS) {
      expect(festivalWalkable(...s.point), s.id).toBe(true);
      expect(findPath(grid, start, s.point, festivalWalkable)?.length, s.id).toBeGreaterThan(0);
    }
    const missing = HUNT_SPOTS.find((s) => !spots.includes(s))!;
    expect(() => fest(token, "fest-hunt", { id: missing.id })).toThrow("No lantern");
    for (const s of spots) fest(token, "fest-hunt", { id: s.id });
    expect(() => fest(token, "fest-hunt", { id: spots[0].id })).toThrow("already found");
    expect(authenticate(token).festival!.tickets).toBe(5 * 3 + 10);
  });
  it("sells decorations into the home stash, outfits and accessories", () => {
    const token = keeper(500);
    fest(token, "fest-buy", { item: "lantern-arch" });
    island(token, "island-travel", { region: "home" });
    expect(authenticate(token).home!.stash!["lantern-arch"]).toBe(1);
    const gold = authenticate(token).gold;
    const { uid } = island(token, "home-place", { item: "lantern-arch", x: 6, z: 6, rot: 0 });
    expect(() => island(token, "home-place", { item: "lantern-arch", x: 6, z: -6, rot: 0 })).toThrow("tickets");
    let p = authenticate(token);
    expect(p.gold).toBe(gold);
    expect(p.home!.stash!["lantern-arch"]).toBe(0);
    island(token, "home-remove", { id: uid });
    expect(authenticate(token).home!.stash!["lantern-arch"]).toBe(1);

    expect(() => fest(token, "fest-outfit", { item: "wreath" })).toThrow("Buy this outfit");
    fest(token, "fest-buy", { item: "wreath" });
    expect(() => fest(token, "fest-buy", { item: "wreath" })).toThrow("already own");
    fest(token, "fest-outfit", { item: "wreath" });
    expect(authenticate(token).festival!.outfit).toBe("wreath");

    fest(token, "fest-buy", { item: "crown" });
    p = authenticate(token);
    const companion = p.owned[0].id;
    operation(token, crypto.randomUUID(), (q) => townMutation(q, "town-equip", { id: companion, item: "crown" }, now));
    expect(authenticate(token).owned[0].accessory).toBe("crown");
    const spent = 30 + 25 + 30;
    expect(authenticate(token).festival!.tickets).toBe(500 - spent);
  });
  it("limits weekly supplies and refuses without tickets", () => {
    const token = keeper(200);
    fest(token, "fest-buy", { item: "crystal" });
    expect(() => fest(token, "fest-buy", { item: "crystal" })).toThrow("Sold out for this week");
    expect(authenticate(token).town!.inventory.crystal).toBe(1);
    fest(token, "fest-buy", { item: "crystal" }, now + 7 * 86400000);
    expect(() => fest(token, "fest-buy", { item: "elixir" }, now + 7 * 86400000)).toThrow("Not enough");
    expect(() => fest(token, "fest-buy", { item: "rocket" })).toThrow("not sold");
    expect(FESTIVAL_SHOP.every((s) => s.id.length <= 20)).toBe(true);
  });
});

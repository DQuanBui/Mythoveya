import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SEASONS, activeSeason } from "../packages/shared/seasons";
import { havenWalkable, HAVEN_HOUSES, HAVEN_CACHES } from "../packages/shared/haven";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-seasons-")), "save.sqlite");
const { createProfile, authenticate, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());

const at = (iso: string) => Date.parse(iso + "T12:00:00Z");

describe("seasonal lantern hunts", () => {
  it("runs each festival only inside its window, keyed by the year it began", () => {
    expect(activeSeason(at("2026-10-23"))).toBeNull();
    expect(activeSeason(at("2026-10-24"))?.key).toBe("lantern-night-2026");
    expect(activeSeason(at("2026-11-07"))?.key).toBe("lantern-night-2026");
    expect(activeSeason(at("2026-11-08"))).toBeNull();
    expect(activeSeason(at("2026-12-18"))?.key).toBe("frostlight-2026");
    // Frostlight runs past New Year but still belongs to the run that began in December.
    expect(activeSeason(at("2027-01-06"))?.key).toBe("frostlight-2026");
    expect(activeSeason(at("2027-01-07"))).toBeNull();
    expect(activeSeason(at("2027-06-01"))).toBeNull();
  });

  it("hides every lantern somewhere a keeper can walk up to, away from houses and caches", () => {
    for (const s of SEASONS) {
      expect(new Set(s.spots.map((p) => p.id)).size).toBe(s.spots.length);
      for (const { id, point: [x, z] } of s.spots) {
        const reachable = [...Array(16)].some((_, a) =>
          havenWalkable(x + Math.cos(a) * 1.2, z + Math.sin(a) * 1.2),
        );
        expect(reachable, id).toBe(true);
        expect(HAVEN_HOUSES.some((h) => Math.abs(x - h.point[0]) < 1.9 && Math.abs(z - h.point[1]) < 1.8), id).toBe(false);
        expect(HAVEN_CACHES.some((c) => Math.hypot(x - c.point[0], z - c.point[1]) < 3), id).toBe(false);
      }
    }
  });

  it("pays for each lantern once, and a bonus when all are found", () => {
    const p = authenticate(createProfile("Lantern Keeper", 1).token),
      now = at("2026-10-30"),
      night = SEASONS[0];
    p.region = "haven";
    const start = { gold: p.gold, diamonds: p.diamonds, tokens: p.tokens };
    game.mutate(p, "season-find", { id: night.spots[0].id }, now);
    expect(p.gold).toBe(start.gold + 25);
    expect(p.town!.inventory.treat).toBeGreaterThanOrEqual(1);
    expect(() => game.mutate(p, "season-find", { id: night.spots[0].id }, now)).toThrow(/already/);
    expect(() => game.mutate(p, "season-find", { id: "fl-bakery" }, now)).toThrow(/isn't one/);
    for (const s of night.spots.slice(1)) game.mutate(p, "season-find", { id: s.id }, now);
    expect(p.diamonds).toBe(start.diamonds + 120);
    expect(p.tokens).toBe(start.tokens + 2);
    expect(p.seasons).toMatchObject({ key: "lantern-night-2026", done: ["lantern-night-2026"] });
    expect(p.seasons!.found).toHaveLength(8);
    // Next year's run starts fresh but keeps the record.
    game.mutate(p, "season-find", { id: night.spots[0].id }, at("2027-10-25"));
    expect(p.seasons).toMatchObject({ key: "lantern-night-2027", found: [night.spots[0].id], done: ["lantern-night-2026"] });
  });

  it("refuses finds outside the festival or away from Havenreach", () => {
    const p = authenticate(createProfile("Off Season", 2).token);
    p.region = "haven";
    expect(() => game.mutate(p, "season-find", { id: "ln-well" }, at("2026-07-01"))).toThrow(/No seasonal/);
    p.region = "canyon";
    expect(() => game.mutate(p, "season-find", { id: "ln-well" }, at("2026-10-30"))).toThrow(/Havenreach/);
    expect(p.seasons).toBeUndefined();
  });
});

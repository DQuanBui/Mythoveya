import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { townMutation } from "../apps/server/town-game";
import { HAVEN_HOUSES, HAVEN_CACHES } from "../packages/shared/haven";
import { weatherAt, WEATHER_SPELL_MS } from "../packages/shared/weather";
import {
  NPCS,
  ensureTown,
  utcDay,
  utcWeek,
  dailyStock,
  GARDEN_GROW_MS,
  FISHING_CASTS_PER_DAY,
} from "../packages/shared/town";

process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-town-")),
  "save.sqlite",
);
const { createProfile, authenticate, operation, save, db } = await import(
  "../apps/server/store"
);
const game = await import("../apps/server/game");
afterAll(() => db.close());
const op = (
  token: string,
  kind: string,
  v: Record<string, unknown> = {},
  now = Date.now(),
  requestId = crypto.randomUUID(),
) => operation(token, requestId, (p) => townMutation(p, kind, v, now));
function keeper() {
  const g = createProfile("Village Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
  });
  return g.token;
}

describe("village progress and durable services", () => {
  it("keeps visitor stamps across reloads and grants the complete-book reward only once", () => {
    const token = keeper(),
      before = authenticate(token);
    delete before.town!.stamps;
    save(before);
    const requestId = crypto.randomUUID();
    op(token, "town-visit", { id: HAVEN_HOUSES[0].id }, Date.now(), requestId);
    op(token, "town-visit", { id: HAVEN_HOUSES[0].id }, Date.now(), requestId);
    expect(authenticate(token).town?.stamps).toHaveLength(1);
    expect(() => op(token, "town-visit", { id: HAVEN_HOUSES[0].id })).toThrow(
      "already collected",
    );
    expect(() => op(token, "town-visit", { id: "fake" })).toThrow(
      "Visit a house",
    );
    for (const h of HAVEN_HOUSES.slice(1))
      op(token, "town-visit", { id: h.id });
    const after = authenticate(token);
    expect(after.town?.stamps).toHaveLength(6);
    expect(after.gold).toBe(before.gold + 90);
    expect(after.diamonds).toBe(before.diamonds + 50);
    expect(after.owned).toEqual(
      before.owned.map((o) => ({ ...o, xp: o.xp + 60 })),
    );
    expect(after.town?.visited).toEqual(before.town?.visited);
    expect(() => op(token, "town-visit", { id: HAVEN_HOUSES[5].id })).toThrow(
      "already collected",
    );
    after.region = "meadow";
    save(after);
    expect(() => op(token, "town-visit", { id: HAVEN_HOUSES[0].id })).toThrow(
      "Visit a house",
    );
  });
  it("opens each Skyglass cache once and pays the completion bonus once", () => {
    const token = keeper(),
      before = authenticate(token);
    delete before.town!.caches;
    save(before);
    const requestId = crypto.randomUUID();
    op(token, "town-cache", { id: "cloudfall" }, Date.now(), requestId);
    op(token, "town-cache", { id: "cloudfall" }, Date.now(), requestId);
    expect(authenticate(token).town?.caches).toEqual(["cloudfall"]);
    expect(authenticate(token).diamonds).toBe(before.diamonds + 40);
    expect(() => op(token, "town-cache", { id: "cloudfall" })).toThrow(
      "already open",
    );
    expect(() => op(token, "town-cache", { id: "fake" })).toThrow(
      "Skyglass caches",
    );
    for (const c of HAVEN_CACHES.filter((c) => c.id !== "cloudfall"))
      op(token, "town-cache", { id: c.id });
    const after = authenticate(token),
      sum = (k: "gold" | "diamonds" | "tokens") =>
        HAVEN_CACHES.reduce((n, c) => n + (c.reward[k] || 0), 0);
    expect(after.town?.caches).toHaveLength(HAVEN_CACHES.length);
    expect(after.diamonds).toBe(before.diamonds + sum("diamonds") + 100);
    expect(after.gold).toBe(before.gold + sum("gold"));
    expect(after.tokens).toBe(before.tokens + sum("tokens"));
    after.region = "canyon";
    after.town!.caches = [];
    save(after);
    expect(() => op(token, "town-cache", { id: "cloudfall" })).toThrow(
      "Skyglass caches",
    );
  });
  it("limits daily fishing casts and stores only successful catches", () => {
    const token = keeper(),
      now = Date.now(),
      fish = (success: boolean, roll: number, at = now) =>
        operation(token, crypto.randomUUID(), (p) =>
          townMutation(p, "town-fish", { success }, at, () => roll),
        ).value;
    expect(fish(false, 0.1)).toMatchObject({ fish: null });
    expect(fish(true, 0.1)).toMatchObject({ fish: "minnow" });
    expect(fish(true, 0.6)).toMatchObject({ fish: "carp" });
    expect(fish(true, 0.95)).toMatchObject({ fish: "skyfin" });
    const p = authenticate(token);
    expect(p.town?.inventory).toMatchObject({ minnow: 1, carp: 1, skyfin: 1 });
    expect(p.town?.fishing).toMatchObject({ casts: 4, caught: 3 });
    for (let i = 4; i < FISHING_CASTS_PER_DAY; i++) fish(false, 0.5);
    expect(() => fish(true, 0.5)).toThrow("resting");
    expect(fish(true, 0.2, now + 86400000)).toMatchObject({ fish: "minnow" });
    op(token, "town-sell", { item: "skyfin" });
    expect(authenticate(token).gold).toBe(p.gold + 45);
    expect(() => op(token, "town-buy", { item: "skyfin" })).toThrow(
      "not in today's stock",
    );
  });
  it("preserves original gathering IDs and gates outer nodes to Havenreach", () => {
    const token = keeper();
    operation(token, crypto.randomUUID(), (p) =>
      game.mutate(p, "resource", { resource: "resource-8" }),
    );
    expect(authenticate(token).resources).toContain("haven:resource-8");
    expect(() =>
      operation(token, crypto.randomUUID(), (p) =>
        game.mutate(p, "resource", { resource: "resource-8" }),
      ),
    ).toThrow("Already gathered");
    const p = authenticate(token);
    p.region = "meadow";
    save(p);
    expect(() =>
      operation(token, crypto.randomUUID(), (p) =>
        game.mutate(p, "resource", { resource: "resource-8" }),
      ),
    ).toThrow("Unknown resource");
    operation(token, crypto.randomUUID(), (p) =>
      game.mutate(p, "resource", { resource: "resource-2" }),
    );
    expect(authenticate(token).town?.inventory.sunseed).toBe(4);
  });
  it("upgrades old saves additively without replacing companions, progress or currencies", () => {
    const token = keeper(),
      p = authenticate(token);
    delete p.town;
    p.version = 1;
    p.wins = 9;
    p.ratings.power = 1234;
    p.gold = 765;
    save(p);
    const upgraded = authenticate(token);
    expect(upgraded.version).toBe(2);
    expect(upgraded.town?.inventory.sunseed).toBe(2);
    const { town, version, ...rest } = upgraded;
    const { version: oldVersion, ...old } = p;
    expect(rest).toEqual(old);
    op(token, "town-plant");
    expect(authenticate(token).town?.inventory.sunseed).toBe(1);
    expect(authenticate(token).owned).toEqual(p.owned);
  });
  it("enforces mission order, rewards once, unlocks a helper and refreshes gifts by UTC day", () => {
    const token = keeper(),
      now = Date.now();
    expect(() =>
      op(token, "town-claim", { npc: "pip", quest: "pip-supplies" }),
    ).toThrow("current mission");
    expect(() => op(token, "town-helper", { npc: "pip" })).toThrow(
      "mission line",
    );
    op(token, "town-buy", { item: "sunseed" });
    const requestId = crypto.randomUUID(),
      data = { npc: "pip", quest: "pip-trade" };
    const first = op(token, "town-claim", data, now, requestId);
    expect(op(token, "town-claim", data, now, requestId)).toEqual(first);
    expect(() => op(token, "town-claim", data)).toThrow("already claimed");
    op(token, "town-sell", { item: "sunseed" });
    op(token, "town-sell", { item: "sunseed" });
    op(token, "town-claim", { npc: "pip", quest: "pip-supplies" });
    expect(authenticate(token).town?.helpers).toContain("pip");
    const before = authenticate(token).gold;
    op(token, "town-helper", { npc: "pip" }, now);
    expect(authenticate(token).gold).toBe(before + 40);
    expect(() => op(token, "town-helper", { npc: "pip" }, now)).toThrow(
      "already collected",
    );
    op(token, "town-helper", { npc: "pip" }, now + 86400000);
    expect(authenticate(token).gold).toBe(before + 80);
  });
  it("limits daily stock and rolls back invalid or unaffordable transactions", () => {
    const token = keeper(),
      p = authenticate(token);
    p.gold = 1000;
    save(p);
    const today = Date.now();
    for (let i = 0; i < 8; i++)
      op(token, "town-buy", { item: "sunseed" }, today);
    expect(() => op(token, "town-buy", { item: "sunseed" }, today)).toThrow(
      "sold out",
    );
    expect(authenticate(token).gold).toBe(904);
    for (const item of ["__proto__", "constructor", "missing"])
      expect(() => op(token, "town-buy", { item })).toThrow("Unknown item");
    const absent = dailyStock(today).includes("bell") ? "ribbon" : "bell";
    expect(() => op(token, "town-buy", { item: absent }, today)).toThrow(
      "not in today's stock",
    );
    const poor = authenticate(token);
    poor.gold = 0;
    save(poor);
    expect(() => op(token, "town-buy", { item: "treat" })).toThrow(
      "Not enough",
    );
    expect(authenticate(token)).toEqual(poor);
    poor.gold = 12;
    save(poor);
    const tomorrow = op(
      token,
      "town-buy",
      { item: "sunseed" },
      today + 86400000,
    );
    expect(tomorrow.profile.town.stock.bought.sunseed).toBe(1);
    expect(tomorrow.profile.gold).toBe(0);
  });
  it("persists garden timestamps and prevents early, repeated or duplicate harvests", () => {
    // Rain speeds growth, so pin this check to a dry spell.
    let now = Date.now();
    while (weatherAt(now).weather === "rain") now += WEATHER_SPELL_MS;
    const token = keeper();
    op(token, "town-plant", {}, now);
    const saved = authenticate(token);
    expect(saved.town?.garden?.readyAt).toBe(now + GARDEN_GROW_MS);
    const reopened = new DatabaseSync(process.env.DB_PATH!);
    const row = reopened
      .prepare("SELECT data FROM profiles WHERE id=?")
      .get(saved.id) as { data: string };
    expect(JSON.parse(row.data).town.garden).toEqual(saved.town?.garden);
    reopened.close();
    expect(() =>
      op(token, "town-harvest", {}, now + GARDEN_GROW_MS - 1),
    ).toThrow("still growing");
    expect(() => op(token, "town-plant", {}, now)).toThrow("current crop");
    const requestId = crypto.randomUUID();
    const result = op(
      token,
      "town-harvest",
      {},
      now + GARDEN_GROW_MS,
      requestId,
    );
    expect(
      op(token, "town-harvest", {}, now + GARDEN_GROW_MS, requestId),
    ).toEqual(result);
    expect(result.profile.town.inventory.sunseed).toBe(4);
    expect(() => op(token, "town-harvest", {}, now + GARDEN_GROW_MS)).toThrow(
      "Plant a seed",
    );
  });
  it("crafts, feeds, renames and swaps accessories without duplicating items", () => {
    const token = keeper(),
      p = authenticate(token),
      id = p.team[0];
    op(token, "town-craft");
    op(token, "town-feed", { id });
    let after = authenticate(token);
    expect(after.owned[0].friendship).toBe(10);
    expect(after.owned[0].xp).toBe(30);
    expect(after.town?.inventory.treat).toBe(0);
    expect(() => op(token, "town-feed", { id })).toThrow("treat first");
    expect(() => op(token, "town-feed", { id: "forged" })).toThrow(
      "owned companion",
    );
    op(token, "town-rename", { id, nickname: "Little Ember" });
    expect(authenticate(token).owned[0].nickname).toBe("Little Ember");
    expect(() =>
      op(token, "town-rename", { id, nickname: "<script>" }),
    ).toThrow("letters");
    op(token, "town-rename", { id, nickname: "" });
    expect(authenticate(token).owned[0].nickname).toBeUndefined();
    after = authenticate(token);
    ensureTown(after).inventory.ribbon = 1;
    after.town!.inventory.bell = 1;
    save(after);
    op(token, "town-equip", { id, item: "ribbon" });
    op(token, "town-equip", { id, item: "bell" });
    op(token, "town-equip", { id, item: "bell" });
    expect(authenticate(token).town?.inventory.ribbon).toBe(1);
    expect(authenticate(token).town?.inventory.bell).toBe(0);
    op(token, "town-equip", { id, item: "none" });
    expect(authenticate(token).town?.inventory.bell).toBe(1);
    after = authenticate(token);
    after.owned[0].friendship = 100;
    after.town!.inventory.treat = 1;
    save(after);
    expect(() => op(token, "town-feed", { id })).toThrow("already full");
    expect(authenticate(token).town?.inventory.treat).toBe(1);
  });
  it("requires real completed battle modes for daily sparring and weekly bounties", () => {
    const token = keeper();
    expect(() => op(token, "town-spar")).toThrow("practice battle");
    expect(() => op(token, "town-weekly")).toThrow("guardian");
    let p = authenticate(token);
    let b = game.startPve(p, false, true);
    b.winner = 1;
    game.finishPve(p.id, b);
    expect(() => op(token, "town-spar")).toThrow("practice battle");
    b = game.startPve(p, false, true);
    b.winner = 0;
    game.finishPve(p.id, b);
    op(token, "town-spar");
    expect(() => op(token, "town-spar")).toThrow("already claimed");
    expect(authenticate(token).wins).toBe(0);
    p = authenticate(token);
    b = game.startPve(p, true);
    b.winner = 0;
    game.finishPve(p.id, b);
    op(token, "town-weekly");
    const after = authenticate(token);
    game.finishPve(p.id, b);
    expect(authenticate(token)).toEqual(after);
    expect(() => op(token, "town-weekly")).toThrow("already claimed");
    expect(() => op(token, "town-spar", {}, Date.now() + 86400000)).toThrow(
      "practice battle",
    );
    expect(() =>
      op(token, "town-weekly", {}, Date.now() + 7 * 86400000),
    ).toThrow("guardian");
    expect(after.town?.sparWon).toBe(utcDay());
    expect(after.town?.guardianWeek).toBe(utcWeek());
  });
  it("provides eight distinct villagers with ordered mission lines and authored topics", () => {
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(8);
    expect(NPCS.flatMap((n) => n.missions)).toHaveLength(16);
    expect(
      NPCS.every(
        (n) =>
          n.topics.length >= 3 && n.topics.every((t) => t.lines.length >= 3),
      ),
    ).toBe(true);
    const token = keeper();
    op(token, "town-talk", { npc: "wren" });
    op(token, "town-track", { npc: "wren" });
    expect(authenticate(token).town?.met).toContain("wren");
    expect(authenticate(token).town?.trackedNpc).toBe("wren");
  });
  it("links existing gathering, training and travel to village objectives", () => {
    const token = keeper();
    for (const resource of ["resource-0", "resource-1", "resource-2"])
      operation(token, crypto.randomUUID(), (p) =>
        game.mutate(p, "resource", { resource }),
      );
    expect(authenticate(token).town?.inventory.sunseed).toBe(5);
    op(token, "town-claim", { npc: "tali", quest: "tali-tracks" });
    operation(token, crypto.randomUUID(), (p) =>
      game.mutate(p, "train", { id: p.team[0] }),
    );
    op(token, "town-claim", { npc: "bram", quest: "bram-basics" });
    const p = authenticate(token);
    p.wins = 2;
    save(p);
    operation(token, crypto.randomUUID(), (p) =>
      game.mutate(p, "travel", { region: "canyon" }),
    );
    op(token, "town-claim", { npc: "tali", quest: "tali-reaches" });
    expect(authenticate(token).town?.helpers).toContain("tali");
    expect(authenticate(token).town?.stats.trained).toBe(1);
  });
});

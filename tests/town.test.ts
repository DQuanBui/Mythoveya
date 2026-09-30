import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { townMutation } from "../apps/server/town-game";
import {
  NPCS,
  ensureTown,
  utcDay,
  utcWeek,
  dailyStock,
  GARDEN_GROW_MS,
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
    const token = keeper(),
      now = Date.now();
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
});

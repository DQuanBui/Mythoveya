import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { townMutation } from "../apps/server/town-game";
import { smithStock, apothecaryStock } from "../packages/shared/shops";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-shops-")), "save.sqlite");
const { createProfile, authenticate, operation, save, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.UTC(2026, 9, 3, 10);
const buy = (token: string, quest: string, item: string, at = now) =>
  operation(token, crypto.randomUUID(), (p) => townMutation(p, "town-shop", { quest, item }, at)).value;
function keeper(gold = 5000) {
  const g = createProfile("Shop Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.gold = gold;
  });
  return g.token;
}

describe("Blacksmith and Apothecary", () => {
  it("sells apothecary goods within daily limits and resets the next day", () => {
    const token = keeper();
    buy(token, "apothecary", "elixir");
    const p = authenticate(token);
    expect(p.town!.inventory.elixir).toBe(1);
    expect(p.gold).toBe(5000 - 180);
    buy(token, "apothecary", "tome");
    expect(() => buy(token, "apothecary", "tome")).toThrow("Sold out");
    expect(buy(token, "apothecary", "tome", now + 86400000)).toBeTruthy();
    expect(() => buy(token, "apothecary", "fake")).toThrow("not in today's stock");
    expect(() => buy(token, "nowhere", "elixir")).toThrow("Unknown shop");
  });
  it("brews Rift crystals only from caught Skyfin", () => {
    const token = keeper();
    expect(() => buy(token, "apothecary", "crystal")).toThrow("Skyfin");
    const p = authenticate(token);
    p.town!.inventory.skyfin = 2;
    save(p);
    buy(token, "apothecary", "crystal");
    const after = authenticate(token);
    expect(after.town!.inventory).toMatchObject({ skyfin: 0, crystal: 1 });
  });
  it("forges blacksmith gear and dust, and refuses when Gold runs short", () => {
    const token = keeper(),
      stock = smithStock(now);
    expect(stock.filter((o) => o.gives.gear).length).toBeGreaterThanOrEqual(2);
    buy(token, "smith", "gear-1");
    buy(token, "smith", "dust");
    const p = authenticate(token);
    expect(p.gear).toHaveLength(1);
    expect(p.gear![0].rarity).toBe(1);
    expect(p.town!.inventory.dust).toBe(6);
    const poor = keeper(50);
    expect(() => buy(poor, "smith", "gear-0")).toThrow("Gold");
    expect(apothecaryStock().every((o) => o.gold > 0)).toBe(true);
  });
  it("applies tonics to the next PvE battle only", () => {
    const token = keeper();
    const base = game.startPve(authenticate(token), false, false, { stage: "c1-1" });
    const hp = base.units.filter((u) => u.side === 0).map((u) => u.maxHp);
    game.pve.delete(authenticate(token).id);
    buy(token, "apothecary", "vigor");
    const boosted = game.startPve(authenticate(token), false, false, { stage: "c1-1" });
    boosted.units
      .filter((u) => u.side === 0)
      .forEach((u, i) => expect(u.maxHp).toBe(Math.round(hp[i] * 1.1)));
    expect(authenticate(token).town!.buffs!.vigor).toBe(0);
    game.pve.delete(authenticate(token).id);
    const after = game.startPve(authenticate(token), false, false, { stage: "c1-1" });
    expect(after.units.filter((u) => u.side === 0).map((u) => u.maxHp)).toEqual(hp);
  });
});

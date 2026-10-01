import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CHAPTERS,
  DUNGEON_RUNS_PER_DAY,
  gearBonus,
  stageUnlocked,
  stageFirstReward,
  enemyLevel,
  BOSS_SCALE,
  type Gear,
} from "../packages/shared/adventure";
import { makeBattle, stats, act } from "../packages/shared/combat";
import type { Battle, Owned } from "../packages/shared/types";
import type { Mission } from "../apps/server/game";
import { own } from "../packages/shared/economy";

process.env.DB_PATH = join(
  mkdtempSync(join(tmpdir(), "mythoveya-adventure-")),
  "save.sqlite",
);
const { createProfile, authenticate, operation, save, db } = await import(
  "../apps/server/store"
);
const game = await import("../apps/server/game");
afterAll(() => db.close());
const mutate = (token: string, kind: string, v: Record<string, unknown> = {}) =>
  operation(token, crypto.randomUUID(), (p) => game.mutate(p, kind, v));
function keeper() {
  const g = createProfile("Rift Keeper", 0);
  mutate(g.token, "starter", { species: "emberfox" });
  mutate(g.token, "guide");
  return g.token;
}
// Wins the active mission instantly and records rewards like a real victory.
function win(token: string, mission: Mission, fainted = 0) {
  const p = authenticate(token);
  const b = game.startPve(p, false, false, mission) as Battle;
  for (const u of b.units) if (u.side === 1) u.hp = 0;
  b.units.filter((u) => u.side === 0).slice(0, fainted).forEach((u) => (u.hp = 0));
  b.winner = 0;
  game.finishPve(p.id, b);
  game.pve.delete(p.id);
  return b;
}

describe("story chapters", () => {
  it("unlocks stages in order and pays first-clear Diamonds only once", () => {
    const token = keeper(),
      before = authenticate(token);
    // At the level cap, level-up bonuses cannot blur stage rewards.
    before.level = 40;
    save(before);
    expect(stageUnlocked(before, "c1-1")).toBe(true);
    expect(stageUnlocked(before, "c1-2")).toBe(false);
    expect(() => game.startPve(before, false, false, { stage: "c1-2" })).toThrow(
      "previous stage",
    );
    const first = win(token, { stage: "c1-1" });
    expect(first.rewards?.diamonds).toBe(stageFirstReward(0, false).diamonds);
    expect(first.rewards?.stars).toBe(3);
    const replay = win(token, { stage: "c1-1" }, 3);
    expect(replay.rewards?.diamonds).toBe(0);
    const p = authenticate(token);
    expect(p.adventure?.stages["c1-1"]).toBe(3);
    expect(stageUnlocked(p, "c1-2")).toBe(true);
    expect(p.wins).toBe(before.wins + 2);
  });
  it("makes the chapter boss tougher, drops equipment and opens the next chapter", () => {
    const token = keeper();
    for (const s of CHAPTERS[0].stages.slice(0, 3)) win(token, { stage: s.id });
    const p = authenticate(token);
    const boss = game.startPve(p, false, false, { stage: "c1-4" }) as Battle;
    const u = boss.units.find((u) => u.side === 1 && u.species === "briarhart")!;
    const normal = makeBattle("x", [[], [{ id: "e", species: "briarhart", level: enemyLevel(CHAPTERS[0].stages[3].level, "briarhart"), xp: 0, shards: 0, upgrade: 0, locked: false }]]).units[0];
    expect(u.maxHp).toBe(Math.round(normal.maxHp * BOSS_SCALE.hp));
    expect(boss.title).toContain("Thornwarden");
    game.pve.delete(p.id);
    const result = win(token, { stage: "c1-4" });
    const after = authenticate(token);
    expect(after.gear).toHaveLength(1);
    expect(after.gear![0].rarity).toBeGreaterThanOrEqual(1);
    expect(result.rewards?.items?.join(" ")).toContain("skill tome");
    expect(after.town?.inventory.tome).toBe(2);
    expect(stageUnlocked(after, "c2-1")).toBe(true);
    expect(() => mutate(token, "chapter-chest", { quest: "c1" })).not.toThrow();
    expect(() => mutate(token, "chapter-chest", { quest: "c1" })).toThrow("already");
  });
});

describe("rift dungeons", () => {
  it("limits daily runs, gates tiers, and rewards Diamonds, gear and tomes", () => {
    const token = keeper(),
      start = authenticate(token);
    expect(() =>
      game.startPve(start, false, false, { dungeon: "vault", tier: 1 }),
    ).toThrow("previous tier");
    for (let i = 0; i < DUNGEON_RUNS_PER_DAY; i++) win(token, { dungeon: "vault", tier: 0 });
    const p = authenticate(token);
    expect(p.diamonds).toBe(start.diamonds + 30 * DUNGEON_RUNS_PER_DAY);
    expect(() => game.startPve(p, false, false, { dungeon: "vault", tier: 0 })).toThrow(
      "No runs left",
    );
    win(token, { dungeon: "forge", tier: 0 });
    win(token, { dungeon: "grove", tier: 0 });
    const after = authenticate(token);
    expect(after.gear).toHaveLength(1);
    expect(after.town?.inventory.dust).toBe(3);
    expect(after.town?.inventory.tome).toBe(1);
    expect(after.town?.inventory.elixir).toBe(1);
    // A new UTC day restores runs.
    after.adventure!.dungeonDay = "2000-01-01";
    save(after);
    expect(() => win(token, { dungeon: "vault", tier: 0 })).not.toThrow();
  });
});

describe("companion skills and equipment", () => {
  it("levels skills with tomes and gold, and stronger skills hit harder", () => {
    const token = keeper(),
      p = authenticate(token);
    p.town!.inventory.tome = 20;
    p.gold = 5000;
    save(p);
    const id = p.team[0];
    expect(() => mutate(token, "skill-up", { id, slot: 1 })).not.toThrow();
    for (let i = 0; i < 4; i++) mutate(token, "skill-up", { id, slot: 2 });
    expect(() => mutate(token, "skill-up", { id, slot: 2 })).toThrow("mastered");
    const o = authenticate(token).owned.find((o) => o.id === id)!;
    expect(o.skills).toEqual([2, 5]);
    expect(authenticate(token).town?.inventory.tome).toBe(20 - 1 - (1 + 2 + 3 + 4));
    const target: Owned = { id: "t", species: "pebblit", level: 1, xp: 0, shards: 0, upgrade: 0, locked: false };
    const hit = (skills?: [number, number]) => {
      const b = makeBattle("s", [[{ ...o, skills }], [target]], "pve", 7);
      b.queue = ["0:0"];
      b.energy = [10, 10];
      act(b, 0, 2, "1:0");
      return b.event!.amounts.find((a) => a.id === "1:0")!.amount;
    };
    expect(hit([1, 5])).toBeGreaterThan(hit([1, 1]));
    const tactical = makeBattle("t", [[o], [target]], "tactical");
    expect(tactical.units[0].skill).toBeUndefined();
  });
  it("equips, forges and salvages gear; bonuses apply outside Tactical Arena", () => {
    const token = keeper();
    win(token, { dungeon: "forge", tier: 0 });
    const p = authenticate(token),
      g = p.gear![0],
      id = p.team[0];
    p.town!.inventory.dust = 50;
    p.gold = 5000;
    save(p);
    mutate(token, "gear-equip", { id, item: g.id });
    expect(() => mutate(token, "gear-salvage", { item: g.id })).toThrow("Unequip");
    mutate(token, "gear-upgrade", { item: g.id });
    const after = authenticate(token);
    expect(after.gear![0]).toMatchObject({ owner: id, level: 1 });
    const battle = game.team(after)[0];
    const base = authenticate(token).owned.find((o) => o.id === id)!;
    const bonus = gearBonus(after.gear![0] as Gear);
    if (bonus.attack)
      expect(stats(battle).attack).toBeGreaterThan(stats(base).attack);
    expect(stats(battle, true)).toEqual(stats(base, true));
    mutate(token, "gear-remove", { item: g.id });
    mutate(token, "gear-salvage", { item: g.id });
    expect(authenticate(token).gear).toHaveLength(0);
    expect(authenticate(token).town!.inventory.dust).toBeGreaterThan(50 - 2);
  });
  it("uses growth elixirs within the keeper level cap", () => {
    const token = keeper(),
      p = authenticate(token);
    p.town!.inventory.elixir = 2;
    p.level = 5;
    save(p);
    mutate(token, "elixir", { id: p.team[0] });
    const o = authenticate(token).owned.find((o) => o.id === p.team[0])!;
    expect(o.level).toBeGreaterThan(1);
    expect(o.level).toBeLessThanOrEqual(5);
  });
});

describe("evolution", () => {
  it("adds sixteen evolved forms outside the recruitment roster", async () => {
    const { EVOLVED, SPECIES, byId: all } = await import("../packages/shared/content");
    const { pull } = await import("../packages/shared/economy");
    expect(EVOLVED).toHaveLength(16);
    expect(new Set(EVOLVED.map((s) => s.id)).size).toBe(16);
    for (const e of EVOLVED) {
      const base = all[e.evolvedFrom!];
      expect(base.evolvesTo).toBe(e.id);
      expect(SPECIES.some((s) => s.id === e.id)).toBe(false);
      expect(e.stats.attack).toBeGreaterThan(base.stats.attack);
      expect(new Set(e.actions.map((a) => a.id)).size).toBe(3);
    }
    const pity = { as: 0, s: 0 };
    for (let i = 0; i < 400; i++)
      expect(all[pull(pity, Math.random)].evolvedFrom).toBeUndefined();
  });
  it("evolves with level, crystals and gold, keeping the companion's progress", () => {
    const token = keeper(),
      p = authenticate(token),
      o = p.owned.find((o) => o.species === "puddlepip")!;
    p.level = 40;
    p.gold = 2000;
    o.level = 9;
    o.skills = [3, 2];
    p.town!.inventory.crystal = 1;
    save(p);
    expect(() => mutate(token, "evolve", { id: o.id })).toThrow("level 10");
    const q = authenticate(token);
    q.owned.find((x) => x.id === o.id)!.level = 10;
    save(q);
    expect(() => mutate(token, "evolve", { id: o.id })).toThrow("Rift crystals");
    const r = authenticate(token);
    r.town!.inventory.crystal = 3;
    save(r);
    const result = mutate(token, "evolve", { id: o.id });
    expect(result.value).toMatchObject({ species: "lilyreign" });
    const after = authenticate(token),
      evolved = after.owned.find((x) => x.id === o.id)!;
    expect(evolved).toMatchObject({ species: "lilyreign", level: 10, skills: [3, 2] });
    expect(after.team).toContain(o.id);
    expect(after.town!.inventory.crystal).toBe(1);
    expect(after.gold).toBe(2000 - 300);
    // Bonding the base species again creates a separate companion.
    operation(token, crypto.randomUUID(), (p) => {
      own(p, "puddlepip");
    });
    const again = authenticate(token).owned.filter((x) => x.species === "puddlepip");
    expect(again).toHaveLength(1);
    expect(again[0].id).not.toBe(o.id);
    expect(() =>
      mutate(token, "evolve", { id: again[0].id }),
    ).toThrow();
  });
  it("evolved forms keep their base signature in battle", () => {
    const heal = (species: string) => {
      const healer: Owned = { id: "h", species, level: 10, xp: 0, shards: 0, upgrade: 0, locked: false };
      const ally = (id: string): Owned => ({ id, species: "pebblit", level: 10, xp: 0, shards: 0, upgrade: 0, locked: false });
      const b = makeBattle("h", [[healer, ally("a"), ally("b")], [ally("e")]], "pve", 3);
      for (const u of b.units.filter((u) => u.side === 0)) u.hp = Math.round(u.maxHp / 3);
      b.queue = ["0:0"];
      b.energy = [10, 10];
      act(b, 0, 1, "0:1");
      return b.event!.amounts.filter((a) => a.amount < 0).length;
    };
    expect(heal("ripplefin")).toBe(2);
    expect(heal("tidecrest")).toBe(2);
  });
  it("pays Rift crystals from bosses and the Crystal Vault", () => {
    const token = keeper(),
      p = authenticate(token);
    p.level = 40;
    p.adventure = { stages: {}, chests: [], best: { vault: 0 }, dungeonDay: "2000-01-01", runs: {}, gearSeq: 0 };
    save(p);
    win(token, { dungeon: "vault", tier: 1 });
    expect(authenticate(token).town!.inventory.crystal).toBe(1);
  });
});

describe("expanded adventure", () => {
  it("climbs the Rift Tower in order and pays each floor once", () => {
    const token = keeper(),
      p = authenticate(token);
    p.level = 40;
    save(p);
    expect(() => game.startPve(authenticate(token), false, false, { tower: 2 })).toThrow("floor 1 is next");
    for (let f = 1; f <= 10; f++) win(token, { tower: f });
    const after = authenticate(token);
    expect(after.adventure!.tower).toBe(10);
    expect(after.gear!.some((g) => g.rarity === 2)).toBe(true);
    expect(() => game.startPve(after, false, false, { tower: 10 })).toThrow("floor 11 is next");
    const warden = game.startPve(after, false, false, { tower: 15 - 4 });
    expect(warden.title).toContain("Floor 11");
    game.pve.delete(after.id);
  });
  it("tower levels rise steadily and every fifth floor has a warden", async () => {
    const { towerFloor, TOWER_FLOORS } = await import("../packages/shared/adventure");
    let last = 0;
    for (let f = 1; f <= TOWER_FLOORS; f++) {
      const t = towerFloor(f);
      expect(t.level).toBeGreaterThanOrEqual(last);
      expect(!!t.boss).toBe(f % 5 === 0);
      last = t.level;
    }
  });
  it("opens chapters six to eight after Heart of the Rift and caps keepers at level 40", async () => {
    const { LEVEL_CAP, gainXp } = await import("../packages/shared/economy");
    expect(CHAPTERS).toHaveLength(8);
    const token = keeper(),
      p = authenticate(token);
    expect(stageUnlocked(p, "c6-1")).toBe(false);
    p.adventure = { stages: { "c5-4": 3 }, chests: [], best: {}, dungeonDay: "2000-01-01", runs: {}, gearSeq: 0 };
    expect(stageUnlocked(p, "c6-1")).toBe(true);
    gainXp(p, 10_000_000);
    expect(p.level).toBe(LEVEL_CAP);
  });
  it("rewards Gold and Rift crystals from the Tidal Grotto", () => {
    const token = keeper(),
      before = authenticate(token);
    win(token, { dungeon: "grotto", tier: 0 });
    const after = authenticate(token);
    expect(after.town!.inventory.crystal).toBe(1);
    expect(after.gold).toBeGreaterThanOrEqual(before.gold + 150);
  });
});

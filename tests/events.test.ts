import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eventMutation } from "../apps/server/events-game";
import { LOGIN_REWARDS, WEEKLY, MONTHLY, track, eventsReady, featuredWeek, FEATURED_WEEKS, FEATURED_CHEST } from "../packages/shared/events";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-events-")), "save.sqlite");
const { createProfile, authenticate, operation, save, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const DAY = 86400000,
  start = Date.UTC(2026, 9, 5, 12); // A Monday.
const ev = (token: string, kind: string, v: Record<string, unknown> = {}, now = start) =>
  operation(token, crypto.randomUUID(), (p) => eventMutation(p, kind, v, now, () => 0.4)).value;
function keeper() {
  const g = createProfile("Event Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
  });
  return g.token;
}

describe("login calendar", () => {
  it("pays one gift per UTC day, advances without resets, and loops after thirty", () => {
    const token = keeper(),
      before = authenticate(token);
    expect(ev(token, "login-claim")).toMatchObject({ day: 1 });
    expect(authenticate(token).gold).toBe(before.gold + LOGIN_REWARDS[0].gold!);
    expect(() => ev(token, "login-claim")).toThrow("already claimed");
    // Skipping days does not reset the calendar.
    expect(ev(token, "login-claim", {}, start + 5 * DAY)).toMatchObject({ day: 2 });
    for (let d = 3; d <= 7; d++) ev(token, "login-claim", {}, start + (d + 5) * DAY);
    const week = authenticate(token);
    expect(week.gear).toHaveLength(1);
    expect(week.gear![0].rarity).toBe(1);
    for (let d = 8; d <= 30; d++) ev(token, "login-claim", {}, start + (d + 5) * DAY);
    expect(authenticate(token).gear!.some((g) => g.rarity === 3)).toBe(true);
    expect(ev(token, "login-claim", {}, start + 40 * DAY)).toMatchObject({ day: 1 });
  });
});

describe("weekly and monthly missions", () => {
  it("tracks real play, pays once, opens the chest, and resets each period", () => {
    const token = keeper(),
      p = authenticate(token);
    for (const m of WEEKLY) track(p, m.metric, m.goal, start);
    save(p);
    expect(() => ev(token, "event-chest", { quest: "weekly-chest" })).toThrow("every mission");
    for (const m of WEEKLY) ev(token, "event-claim", { quest: m.id });
    expect(() => ev(token, "event-claim", { quest: WEEKLY[0].id })).toThrow("already");
    const before = authenticate(token).diamonds;
    ev(token, "event-chest", { quest: "weekly-chest" });
    expect(authenticate(token).diamonds).toBeGreaterThan(before);
    expect(() => ev(token, "event-claim", { quest: MONTHLY[0].id })).toThrow("Finish");
    // Next Monday: weekly counters and claims reset, monthly progress stays.
    const next = start + 7 * DAY;
    expect(() => ev(token, "event-claim", { quest: WEEKLY[0].id }, next)).toThrow("Finish");
    expect(authenticate(token).events!.monthly.wins).toBe(WEEKLY[0].goal);
  });
  it("counts battles, gathering and training from the game itself", () => {
    const token = keeper();
    operation(token, crypto.randomUUID(), (p) => {
      p.gold = 1000;
      game.mutate(p, "train", { id: p.team[0] });
      game.mutate(p, "resource", { resource: "resource-1" });
    });
    const p = authenticate(token);
    const b = game.startPve(p, false, false, { stage: "c1-1" });
    for (const u of b.units) if (u.side === 1) u.hp = 0;
    b.winner = 0;
    game.finishPve(p.id, b);
    const e = authenticate(token).events!;
    expect(e.weekly).toMatchObject({ train: 1, resources: 1, wins: 1, stages: 1, stars: 3 });
    expect(eventsReady(authenticate(token), "2000-01-01")).toBe(true);
  });
});

describe("featured weeks", () => {
  it("rotates through every theme, one per UTC week, changing on Monday", () => {
    const seen = [0, 1, 2, 3].map((w) => featuredWeek(start + w * 7 * DAY).id);
    expect(new Set(seen).size).toBe(FEATURED_WEEKS.length);
    expect(featuredWeek(start + 6.5 * DAY - 1).id).toBe(seen[0]); // Sunday 23:59:59
    expect(featuredWeek(start + 4 * 7 * DAY).id).toBe(seen[0]);
    for (const w of FEATURED_WEEKS)
      for (const m of w.missions) expect(m.id.startsWith("w-f-")).toBe(true);
  });
  it("pays this week's missions and chest once, keeps the stamp after the reset", () => {
    const token = keeper(),
      f = featuredWeek(start),
      p = authenticate(token);
    expect(() => ev(token, "event-claim", { quest: f.missions[0].id })).toThrow("Finish");
    const other = FEATURED_WEEKS.find((w) => w.id !== f.id)!;
    expect(() => ev(token, "event-claim", { quest: other.missions[0].id })).toThrow("Unknown mission");
    for (const m of f.missions) track(p, m.metric, m.goal, start);
    save(p);
    expect(eventsReady(authenticate(token), "2026-10-05", start)).toBe(true);
    expect(() => ev(token, "event-chest", { quest: FEATURED_CHEST })).toThrow("every mission");
    for (const m of f.missions) ev(token, "event-claim", { quest: m.id });
    expect(() => ev(token, "event-claim", { quest: f.missions[0].id })).toThrow("already");
    const before = authenticate(token).diamonds;
    expect(ev(token, "event-chest", { quest: FEATURED_CHEST }).message).toContain("stamp");
    expect(authenticate(token).diamonds).toBe(before + f.chest.diamonds!);
    expect(() => ev(token, "event-chest", { quest: FEATURED_CHEST })).toThrow("already");
    // The next week brings a new theme and fresh claims; the stamp stays.
    const next = start + 7 * DAY,
      g = featuredWeek(next);
    expect(g.id).not.toBe(f.id);
    expect(() => ev(token, "event-chest", { quest: FEATURED_CHEST }, next)).toThrow("every mission");
    expect(authenticate(token).events!.stamps).toEqual([f.id]);
  });
});

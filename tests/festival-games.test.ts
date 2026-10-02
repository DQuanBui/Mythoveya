import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COURSE,
  RACE,
  TICKET_PLAYS,
  courseObstacles,
  courseTrace,
  featuredActivity,
  racePads,
  raceTrace,
  rivalPresses,
  simulateCourse,
  simulateRace,
} from "../packages/shared/festival-games";
import { utcDay } from "../packages/shared/town";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-fairgames-")), "save.sqlite");
const { createProfile, authenticate, operation, topRuns, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const now = Date.UTC(2026, 9, 3, 10),
  day = utcDay(now);
const act = (token: string, kind: string, v: Record<string, unknown>, at: number) =>
  operation(token, crypto.randomUUID(), (p) => game.mutate(p, kind, v, at)).value;
function fairgoer(name: string) {
  const g = createProfile(name, 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.wins = 1;
    game.mutate(p, "island-travel", { region: "festival" });
  });
  return g.token;
}
const perfectCourse = () =>
  courseObstacles(day).map((o) => {
    const t = Math.round((o.x / COURSE.speed) * 1000 - 300);
    return o.kind === "jump" ? t : -t;
  });

describe("festival game simulations", () => {
  it("is deterministic, rewards pads and punishes boosting without stamina", () => {
    const pads = racePads(day);
    expect(racePads(day)).toEqual(pads);
    const idle = simulateRace([], pads, 0);
    expect(idle.time).toBe(40000);
    const rival = rivalPresses(pads, 0.3, 0.6);
    const a = simulateRace(rival, pads, 0.3);
    expect(simulateRace(rival, pads, 0.3)).toEqual(a);
    expect(a.time).toBeLessThan(32000);
    expect(a.perfect).toBeGreaterThan(0);
    const spam = simulateRace(Array.from({ length: 200 }, (_, i) => (i + 1) * 200), pads, 0);
    expect(spam.stumbles).toBeGreaterThan(10);
    expect(spam.time).toBeGreaterThan(idle.time);
    // A ghost trace ends where the scored run finishes.
    const trace = raceTrace(rival, pads, 0.3);
    expect(trace.at(-1)).toBe(RACE.length);
    expect(Math.abs(trace.length * 50 - a.time)).toBeLessThan(100);
  });
  it("clears the course only with the right move at the right moment", () => {
    const obstacles = courseObstacles(day);
    expect(obstacles.length).toBeGreaterThan(8);
    expect(simulateCourse(perfectCourse(), obstacles)).toMatchObject({ misses: 0, time: 29333 });
    expect(simulateCourse([], obstacles).misses).toBe(obstacles.length);
    const wrong = perfectCourse().map((t) => -t);
    expect(simulateCourse(wrong, obstacles).misses).toBeGreaterThan(obstacles.length / 2);
    expect(courseTrace(perfectCourse(), obstacles).at(-1)).toBe(COURSE.length);
  });
});

describe("server-scored festival runs", () => {
  it("needs a start, respects the clock and records the best run", () => {
    const token = fairgoer("Speedy");
    const inputs = perfectCourse();
    expect(() => act(token, "fest-run", { quest: "course", inputs }, now)).toThrow("Start the game");
    act(token, "fest-start", { quest: "course" }, now);
    expect(() => act(token, "fest-run", { quest: "course", inputs }, now + 5000)).toThrow("faster than the clock");
    const run = act(token, "fest-run", { quest: "course", inputs }, now + 31000);
    expect(run).toMatchObject({ score: 29333, misses: 0, personal: true, rank: 1 });
    const featured = featuredActivity(day) === "course" ? 2 : 1;
    expect(run.tickets).toBe(6 * featured);
    // A slower run later keeps the best on the board.
    act(token, "fest-start", { quest: "course" }, now + 60000);
    act(token, "fest-run", { quest: "course", inputs: [] }, now + 110000);
    const p = authenticate(token);
    expect(p.festival!.best.course).toBe(29333);
    expect(topRuns(day, "course", true)[0]).toMatchObject({ name: "Speedy", score: 29333 });
    expect(topRuns("all", "course", true)[0].score).toBe(29333);
  });
  it("ranks racers, keeps ghost data and caps ticket-earning plays", () => {
    const fast = fairgoer("Comet"),
      slow = fairgoer("Drizzle");
    const pads = racePads(day);
    const raceWith = (token: string, inputs: number[], at: number) => {
      const companion = authenticate(token).owned[0].id;
      act(token, "fest-start", { quest: "race" }, at);
      return act(token, "fest-run", { quest: "race", id: companion, inputs }, at + 45000);
    };
    raceWith(slow, [], now);
    const r = raceWith(fast, rivalPresses(pads, 0.1, 0.6), now);
    expect(r.rank).toBe(1);
    const board = topRuns(day, "race", true);
    expect(board.map((b) => b.name)).toEqual(["Comet", "Drizzle"]);
    expect(board[0].data.species).toBe("emberfox");
    expect(Array.isArray(board[0].data.inputs)).toBe(true);
    let tickets = 0;
    for (let i = 0; i < TICKET_PLAYS + 1; i++) tickets = raceWith(slow, [], now + (i + 1) * 100000).tickets;
    expect(tickets).toBe(0);
    expect(() => act(slow, "fest-start", { quest: "juggling" }, now)).toThrow("Choose a festival game");
  });
});

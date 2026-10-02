// Festival minigames as deterministic simulations. The client plays them live,
// the server replays the recorded presses to score a run, and the same
// recordings drive ghost racers. Every player gets the same course each day.
import { byId, TIERS } from "./content";
import type { Owned } from "./types";
import { daySeed, seededRandom } from "./festival";

export const TICK = 50;
export type Activity = "race" | "course" | "fishing";
export const ACTIVITIES: Record<
  Activity,
  { name: string; icon: string; blurb: string; lowerIsBetter: boolean; unit: string }
> = {
  race: {
    name: "Sprint Stakes",
    icon: "➶",
    blurb: "Race your companion two laps. Boost on the glowing pads, and never boost without stamina.",
    lowerIsBetter: true,
    unit: "time",
  },
  course: {
    name: "Hop Hollow course",
    icon: "⤴",
    blurb: "Run the obstacle lane yourself. Jump hurdles, slide under swinging bars.",
    lowerIsBetter: true,
    unit: "time",
  },
  fishing: {
    name: "Lantern pond tournament",
    icon: "≈",
    blurb: "Forty-five seconds to land the best catch. Reel when the float dips.",
    lowerIsBetter: false,
    unit: "points",
  },
};
/** The featured activity pays double tickets; it changes every day. */
export function featuredActivity(day: string): Activity {
  const order: Activity[] = ["race", "course", "fishing"];
  return order[daySeed(day, "featured") % order.length];
}
export const TICKET_PLAYS = 5;
export const MAX_PRESSES = 400;

// ---- Sprint Stakes ----
export const RACE = { length: 360, laps: 2, base: 9, maxMs: 90000, boostCost: 30, padCost: 15 };
export function racePads(day: string) {
  const random = seededRandom(daySeed(day, "race-pads")),
    pads: number[] = [];
  for (let i = 0; i < 7; i++) pads.push(Math.round(25 + i * 47 + random() * 18));
  return pads;
}
/** A small edge from the companion's rank and level, never more than 1 m/s. */
export function raceBonus(o: Pick<Owned, "species" | "level">) {
  const s = byId[o.species];
  const rank = s ? Math.max(0, TIERS.indexOf(s.tier as (typeof TIERS)[number])) : 0;
  return Math.min(1, rank * 0.1 + Math.min(0.5, o.level * 0.0125));
}
export class RaceSim {
  t = 0;
  d = 0;
  speed = RACE.base;
  stamina = 100;
  boostUntil = -1;
  boostPower = 0;
  stumbleUntil = -1;
  perfect = 0;
  stumbles = 0;
  finished: number | null = null;
  private queue: number[] = [];
  constructor(
    readonly pads: number[],
    readonly bonus: number,
  ) {}
  press(at: number) {
    this.queue.push(at);
  }
  onPad() {
    return this.pads.some((p) => Math.abs(this.d - p) <= 4);
  }
  /** Steps in fixed ticks; a press takes effect on the first tick at or after it. */
  advance(to: number) {
    while (this.finished === null && this.t + TICK <= to && this.t < RACE.maxMs) {
      this.t += TICK;
      this.queue.sort((a, b) => a - b);
      while (this.queue.length && this.queue[0] <= this.t) {
        this.queue.shift();
        const pad = this.onPad(),
          cost = pad ? RACE.padCost : RACE.boostCost;
        if (this.t < this.stumbleUntil) continue;
        if (this.stamina >= cost) {
          this.stamina -= cost;
          this.boostUntil = this.t + 1500;
          this.boostPower = pad ? 6 : 4;
          if (pad) this.perfect++;
        } else {
          this.stumbleUntil = this.t + 700;
          this.boostUntil = -1;
          this.stumbles++;
        }
      }
      const base = RACE.base + this.bonus;
      this.speed = this.t < this.stumbleUntil ? base * 0.45 : this.t < this.boostUntil ? base + this.boostPower : base;
      const before = this.d;
      this.d += (this.speed * TICK) / 1000;
      this.stamina = Math.min(100, this.stamina + (12 * TICK) / 1000);
      if (this.d >= RACE.length) {
        const over = (this.d - RACE.length) / (this.d - before);
        this.finished = Math.round(this.t - over * TICK);
        this.d = RACE.length;
      }
    }
    return this;
  }
}
export function simulateRace(presses: number[], pads: number[], bonus: number) {
  const sim = new RaceSim(pads, bonus);
  presses.forEach((p) => sim.press(p));
  sim.advance(RACE.maxMs);
  return { time: sim.finished ?? RACE.maxMs, perfect: sim.perfect, stumbles: sim.stumbles };
}
/** Distance every tick, for replaying a recorded run as a ghost. */
export function raceTrace(presses: number[], pads: number[], bonus: number) {
  const sim = new RaceSim(pads, bonus),
    trace: number[] = [0];
  presses.forEach((p) => sim.press(p));
  while (sim.finished === null && sim.t < RACE.maxMs) trace.push(sim.advance(sim.t + TICK).d);
  return trace;
}
/** A fair rival: boosts whenever it can afford a pad boost, with a little hesitation. */
export function rivalPresses(pads: number[], bonus: number, skill: number) {
  const sim = new RaceSim(pads, bonus),
    presses: number[] = [];
  while (sim.finished === null && sim.t < RACE.maxMs) {
    const pad = sim.onPad();
    const wait = sim.t < sim.boostUntil || sim.t < sim.stumbleUntil;
    if (!wait && ((pad && sim.stamina >= RACE.padCost) || (!pad && sim.stamina >= 100 - skill * 40))) {
      presses.push(sim.t + TICK);
      sim.press(sim.t + TICK);
    }
    sim.advance(sim.t + TICK);
  }
  return presses;
}

// ---- Hop Hollow obstacle course ----
export const COURSE = { length: 220, speed: 7.5, action: 600, penalty: 1000, maxMs: 90000 };
export type Obstacle = { x: number; kind: "jump" | "slide" };
export function courseObstacles(day: string): Obstacle[] {
  const random = seededRandom(daySeed(day, "course")),
    list: Obstacle[] = [];
  let x = 22;
  while (x < COURSE.length - 12) {
    list.push({ x: Math.round(x), kind: random() < 0.55 ? "jump" : "slide" });
    x += 11 + random() * 8;
  }
  return list;
}
/** Inputs are press times in ms: positive for a jump, negative for a slide. */
export class CourseSim {
  t = 0;
  d = 0;
  misses = 0;
  cleared = 0;
  stallUntil = -1;
  action: { kind: "jump" | "slide"; until: number } | null = null;
  finished: number | null = null;
  next = 0;
  private queue: number[] = [];
  constructor(readonly obstacles: Obstacle[]) {}
  press(input: number) {
    this.queue.push(input);
  }
  advance(to: number) {
    while (this.finished === null && this.t + TICK <= to && this.t < COURSE.maxMs) {
      this.t += TICK;
      this.queue.sort((a, b) => Math.abs(a) - Math.abs(b));
      while (this.queue.length && Math.abs(this.queue[0]) <= this.t) {
        const input = this.queue.shift()!;
        // A new move starts only once the last one has finished.
        if (!this.action || this.t >= this.action.until)
          this.action = { kind: input > 0 ? "jump" : "slide", until: this.t + COURSE.action };
      }
      const v = this.t < this.stallUntil ? 0 : COURSE.speed;
      const before = this.d;
      this.d += (v * TICK) / 1000;
      const o = this.obstacles[this.next];
      if (o && this.d >= o.x) {
        this.next++;
        if (this.action && this.t < this.action.until && this.action.kind === o.kind) this.cleared++;
        else {
          this.misses++;
          this.stallUntil = this.t + COURSE.penalty;
        }
      }
      if (this.d >= COURSE.length) {
        const over = (this.d - COURSE.length) / (this.d - before);
        this.finished = Math.round(this.t - over * TICK);
        this.d = COURSE.length;
      }
    }
    return this;
  }
}
export function simulateCourse(inputs: number[], obstacles: Obstacle[]) {
  const sim = new CourseSim(obstacles);
  inputs.forEach((i) => sim.press(i));
  sim.advance(COURSE.maxMs);
  return { time: sim.finished ?? COURSE.maxMs, misses: sim.misses, cleared: sim.cleared };
}
export function courseTrace(inputs: number[], obstacles: Obstacle[]) {
  const sim = new CourseSim(obstacles),
    trace: number[] = [0];
  inputs.forEach((i) => sim.press(i));
  while (sim.finished === null && sim.t < COURSE.maxMs) trace.push(sim.advance(sim.t + TICK).d);
  return trace;
}

/** Tickets for a finished run, before the featured bonus. */
export function runTickets(activity: Activity, result: { time?: number; misses?: number; score?: number }) {
  if (activity === "race") return result.time! < 30000 ? 6 : result.time! < 34000 ? 4 : 2;
  if (activity === "course") return result.misses === 0 ? 6 : result.misses! <= 2 ? 4 : 2;
  return result.score! >= 40 ? 6 : result.score! >= 20 ? 4 : 2;
}
export const formatScore = (activity: Activity, score: number) =>
  ACTIVITIES[activity].lowerIsBetter ? `${(score / 1000).toFixed(2)} s` : `${score} pts`;

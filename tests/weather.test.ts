import { afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { townMutation } from "../apps/server/town-game";
import { GARDEN_GROW_MS } from "../packages/shared/town";
import {
  weatherAt,
  fishWeights,
  regionWeather,
  WEATHER_SPELL_MS,
  RAIN_GROWTH,
  type Weather,
} from "../packages/shared/weather";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-weather-")), "save.sqlite");
const { createProfile, operation, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
const find = (w: Weather) => {
  let t = Date.UTC(2026, 9, 1);
  while (weatherAt(t).weather !== w) t += WEATHER_SPELL_MS;
  return t + 1000;
};

describe("island weather", () => {
  it("is deterministic, varied, and never rains two spells in a row", () => {
    const counts: Record<string, number> = { clear: 0, mist: 0, rain: 0 };
    let last: Weather = "clear";
    for (let i = 0; i < 2000; i++) {
      const t = Date.UTC(2026, 0, 1) + i * WEATHER_SPELL_MS;
      const w = weatherAt(t).weather;
      expect(weatherAt(t + 1000).weather).toBe(w);
      expect(w === "rain" && last === "rain").toBe(false);
      counts[w]++;
      last = w;
    }
    expect(counts.rain / 2000).toBeGreaterThan(0.12);
    expect(counts.clear / 2000).toBeGreaterThan(0.45);
    expect(regionWeather("rain", "canyon")).toBe("mist");
  });
  it("makes rare fish likelier in rain, server side", () => {
    expect(fishWeights("rain").skyfin).toBeGreaterThan(fishWeights("clear").skyfin);
    for (const w of ["clear", "mist", "rain"] as const)
      expect(Object.values(fishWeights(w)).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const g = createProfile("Rain Fisher", 0);
    operation(g.token, crypto.randomUUID(), (p) => {
      game.mutate(p, "starter", { species: "emberfox" });
    });
    const catchAt = (t: number) =>
      operation(g.token, crypto.randomUUID(), (p) =>
        townMutation(p, "town-fish", { success: true }, t, () => 0.8),
      ).value.fish;
    // The same roll lands a skyfin only in the rain.
    expect(catchAt(find("clear"))).toBe("carp");
    expect(catchAt(find("rain"))).toBe("skyfin");
  });
  it("grows garden crops faster when planted in rain", () => {
    const g = createProfile("Rain Gardener", 0);
    const plant = (t: number) =>
      operation(g.token, crypto.randomUUID(), (p) => {
        townMutation(p, "town-plant", {}, t);
        const r = p.town!.garden!.readyAt - t;
        p.town!.garden = null;
        return r;
      }).value;
    expect(plant(find("clear"))).toBe(GARDEN_GROW_MS);
    expect(plant(find("rain"))).toBe(Math.round(GARDEN_GROW_MS * RAIN_GROWTH));
  });
});

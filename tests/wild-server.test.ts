import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASE_WILD, SPECIAL_WILD, wildTimes } from "../packages/shared/wild";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "mythoveya-wild-")), "save.sqlite");
const { createProfile, authenticate, operation, db } = await import("../apps/server/store");
const game = await import("../apps/server/game");
afterAll(() => db.close());
afterEach(() => vi.useRealTimers());

function keeper(wins: number) {
  const g = createProfile("Wild Keeper", 0);
  operation(g.token, crypto.randomUUID(), (p) => {
    game.mutate(p, "starter", { species: "emberfox" });
    game.mutate(p, "guide", {});
    p.wins = wins;
  });
  return g.token;
}
/** A moment when Havenreach has night but no rain or mist, found from the shared clocks. */
function clearNight() {
  for (let now = Date.UTC(2026, 10, 1); ; now += 60000) {
    const times = wildTimes("haven", now);
    if (times.length === 1 && times[0] === "night") return now;
  }
}
const enemies = (token: string) => game.startPve(authenticate(token), false).units.filter((u) => u.side === 1).map((u) => u.species);

describe("wild encounters by time and weather", () => {
  it("bring night creatures out after dark, and offer one a bond after a win", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(clearNight());
    const token = keeper(3),
      b = game.startPve(authenticate(token), false),
      species = b.units.filter((u) => u.side === 1).map((u) => u.species),
      night = species.filter((s) => SPECIAL_WILD.haven.night!.includes(s));
    expect(night.length).toBe(2);
    expect(b.title).toBe("Wild encounter at night");
    for (const u of b.units) if (u.side === 1) u.hp = 0;
    b.winner = 0;
    const p = authenticate(token);
    game.finishPve(p.id, b);
    expect(night).toContain(authenticate(token).bond?.species);
  });
  it("keep a keeper's first battle to the familiar six, whatever the hour", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(clearNight());
    expect(enemies(keeper(0))).toEqual(BASE_WILD.haven);
  });
  it("leave guardians and practice as they were", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(clearNight());
    const token = keeper(3);
    const practice = game.startPve(authenticate(token), false, true);
    expect(practice.units.filter((u) => u.side === 1).map((u) => u.species)).toEqual(BASE_WILD.haven);
  });
});

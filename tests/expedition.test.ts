import { makeBattle, act } from "../packages/shared/combat";
import { guardianIntent } from "../packages/shared/guardian";
import { describe, expect, it } from "vitest";
import {
  FIELD_HOUSES,
  FIELD_NODES,
  GUARDIAN_POINT,
  MILL_POINT,
  WILDWOOD_PLACES,
  discoveryWindow,
  expeditionOf,
} from "../packages/shared/wildwood";
import { havenWalkable, groundHeight } from "../packages/shared/haven";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
import { DAY_CYCLE_MS, worldHour } from "../packages/shared/world-time";
import type { Profile } from "../packages/shared/types";

describe("western Havenreach", () => {
  it("connects every expedition stop without crossing lake or house walls", () => {
    expect(havenWalkable(-49, 12)).toBe(false);
    expect(groundHeight(-61, 1)).toBeGreaterThan(3);
    for (const h of FIELD_HOUSES) expect(havenWalkable(...h.point)).toBe(false);
    const grid = buildGrid(havenWalkable, 78);
    for (const target of [
      ...FIELD_HOUSES.map((h) => h.door),
      ...FIELD_NODES.map((n) => [...n.point] as [number, number]),
      ...WILDWOOD_PLACES.map((p) => p.point),
      MILL_POINT,
      GUARDIAN_POINT,
    ]) {
      expect(havenWalkable(...target), String(target)).toBe(true);
      const path = findPath(grid, [0, 5], target, havenWalkable);
      expect(path, String(target)).toBeTruthy();
      let from: [number, number] = [0, 5];
      for (const step of path!) {
        expect(lineClear(from, step, havenWalkable)).toBe(true);
        from = step;
      }
      expect(Math.hypot(from[0] - target[0], from[1] - target[1])).toBeLessThan(
        0.5,
      );
    }
  });
  it("reads legacy saves without mutation and shares the actual day/night schedule", () => {
    const p = {} as Profile;
    expect(expeditionOf(p).restored).toBe(false);
    expect(p.expedition).toBeUndefined();
    expect(worldHour(0)).toBe(6);
    expect(worldHour(DAY_CYCLE_MS * 0.65)).toBe(18);
    expect(discoveryWindow("starglass", 0)).toBe(false);
    expect(discoveryWindow("starglass", DAY_CYCLE_MS * 0.8)).toBe(true);
    expect(discoveryWindow("forged", Date.now())).toBe(false);
  });
});

it("applies the telegraphed guardian resistance and vulnerability to real damage", () => {
  const owned = (species: string) => ({
    id: species,
    species,
    level: 1,
    xp: 0,
    shards: 0,
    upgrade: 0,
    locked: false,
  });
  const base = makeBattle(
    "mantle",
    [[owned("emberfox")], [owned("galehart")]],
    "pve",
    65,
  );
  const damage = (round: number, encounter?: "windmill") => {
    const b = structuredClone(base);
    b.round = round;
    b.encounter = encounter;
    b.queue = ["0:0", "1:0"];
    b.readyAt = 0;
    const target = b.units[1],
      before = target.hp;
    act(b, 0, 0, target.id, 100000, true);
    return before - target.hp;
  };
  expect(damage(1, "windmill")).toBeCloseTo(damage(1) * 0.5, -1);
  expect(damage(2, "windmill")).toBeCloseTo(damage(2) * 2, -1);
  base.encounter = "windmill";
  expect(guardianIntent(base)?.title).toBe("Wind mantle");
  base.units[1].hp = 0;
  expect(guardianIntent(base)).toBeNull();
});

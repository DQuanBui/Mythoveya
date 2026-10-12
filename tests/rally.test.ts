import { expect, it } from "vitest";
import {
  RALLY_HOSTS,
  rallyActivity,
  rallyOf,
  rallyBlocked,
  rallyProp,
} from "../packages/shared/rally";
import { havenWalkable, groundHeight } from "../packages/shared/haven";
import { meadowWalkable, meadowHeight } from "../packages/shared/meadow";
import { canyonWalkable, canyonHeight } from "../packages/shared/canyon";
import { hollowWalkable, hollowHeight } from "../packages/shared/hollow";
import { buildGrid, findPath } from "../packages/shared/pathfind";
import type { Profile } from "../packages/shared/types";
it("keeps all four rally approaches reachable and prop sites on level open ground", () => {
  const rules = [
    [havenWalkable, groundHeight, 78],
    [meadowWalkable, meadowHeight, 46],
    [canyonWalkable, canyonHeight, 52],
    [hollowWalkable, hollowHeight, 52],
  ] as const;
  RALLY_HOSTS.forEach((h, i) => {
    const [baseWalk, ground, extent] = rules[i];
    const walk = (x: number, z: number) =>
      baseWalk(x, z) && !rallyBlocked(h.region, x, z);
    const [px, pz] = rallyProp(h);
    expect(baseWalk(px, pz), h.region + " camp footprint").toBe(true);
    expect(walk(h.point[0], h.point[1] + 2), h.region + " wildlife").toBe(
      true,
    );
    expect(walk(...h.point), h.region).toBe(true);
    expect(
      findPath(buildGrid(walk, extent), [0, 5], h.point, walk),
      h.region,
    ).not.toBeNull();
    expect(Number.isFinite(ground(...h.point))).toBe(true);
  });
});
it("rotates through all activity kinds and resets only daily claims at UTC midnight", () => {
  const now = Date.parse("2026-10-11T23:59:59Z"),
    next = now + 2000;
  for (const h of RALLY_HOSTS)
    expect(
      new Set(
        [0, 1, 2].map((d) => rallyActivity(h.region, now + d * 86400000).kind),
      ).size,
    ).toBe(3);
  const p = {
    rally: {
      day: "2026-10-11",
      completed: ["haven"],
      stamps: ["haven"],
      finished: false,
    },
  } as Profile;
  expect(rallyOf(p, next).completed).toEqual([]);
  expect(rallyOf(p, next).stamps).toEqual(["haven"]);
  expect(p.rally!.completed).toEqual(["haven"]);
  expect(rallyOf({} as Profile).stamps).toEqual([]);
});

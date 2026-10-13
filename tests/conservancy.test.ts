import { expect, it } from "vitest";
import {
  OUTPOSTS,
  CONSERVANCY_PATHS,
  conservancyStops,
  conservancyBlocked,
  conservancyOf,
  conservancyProp,
} from "../packages/shared/conservancy";
import { havenWalkable, groundHeight } from "../packages/shared/haven";
import { meadowWalkable, meadowHeight } from "../packages/shared/meadow";
import { canyonWalkable, canyonHeight } from "../packages/shared/canyon";
import { hollowWalkable, hollowHeight } from "../packages/shared/hollow";
import { rallyBlocked } from "../packages/shared/rally";
import { buildGrid, findPath } from "../packages/shared/pathfind";
import type { Profile } from "../packages/shared/types";
it("keeps every outpost and supply stop reachable with clear connecting paths", () => {
  const rules = [
    [havenWalkable, groundHeight, 78],
    [meadowWalkable, meadowHeight, 46],
    [canyonWalkable, canyonHeight, 52],
    [hollowWalkable, hollowHeight, 52],
  ] as const;
  OUTPOSTS.forEach((h, i) => {
    const [base, ground, extent] = rules[i],
      walk = (x: number, z: number) =>
        base(x, z) &&
        !rallyBlocked(h.region, x, z) &&
        !conservancyBlocked(h.region, x, z),
      grid = buildGrid(walk, extent);
    for (const s of conservancyStops(h.region)) {
      expect(walk(...s.point), s.name + " approach").toBe(true);
      expect(
        findPath(grid, [0, 5], s.point, walk),
        s.name + " route",
      ).not.toBeNull();
    }
    for (const path of CONSERVANCY_PATHS[h.region])
      for (let i = 1; i < path.length; i++)
        for (let t = 0; t <= 1; t += 0.05) {
          const a = path[i - 1],
            b = path[i],
            x = a[0] * (1 - t) + b[0] * t,
            z = a[1] * (1 - t) + b[1] * t;
          expect(walk(x, z), `${h.region} path ${x},${z}`).toBe(true);
        }
    const [x, z] = conservancyProp(h);
    expect(base(x, z), h.region + " foundation").toBe(true);
    expect(
      Math.abs(ground(x - 1, z) - ground(x + 1, z)),
      h.region + " foundation slope",
    ).toBeLessThan(1);
    expect(walk(h.point[0], h.point[1] + 2), h.region + " wildlife").toBe(true);
  });
});
it("resets daily supply and care claims while retaining materials kits restoration and awards", () => {
  const p = {
    conservancy: {
      day: "2026-10-12",
      gathered: ["cons-haven-timber"],
      tended: ["haven"],
      materials: { timber: 3, fiber: 2, crystal: 1 },
      kits: { shelter: 1, planter: 0, lantern: 0 },
      installed: { haven: ["lantern"] },
      claims: ["mossloom"],
    },
  } as unknown as Profile;
  const r = conservancyOf(p, Date.parse("2026-10-13T00:00:01Z"));
  expect(r.gathered).toEqual([]);
  expect(r.tended).toEqual([]);
  expect(r.materials.timber).toBe(3);
  expect(r.installed.haven).toEqual(["lantern"]);
  expect(r.claims).toEqual(["mossloom"]);
  expect(p.conservancy!.gathered).toHaveLength(1);
});

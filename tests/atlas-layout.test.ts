import {
  ATLAS_CHAPTERS,
  ATLAS_PATHS,
  atlasStops,
  atlasBlocked,
  atlasProp,
  tabletProp,
} from "../packages/shared/atlas";
import { expect, it } from "vitest";
import { conservancyBlocked } from "../packages/shared/conservancy";
import {
  havenWalkable,
  groundHeight,
  HAVEN_PATHS,
} from "../packages/shared/haven";
import {
  meadowWalkable,
  meadowHeight,
  MEADOW_PATHS,
} from "../packages/shared/meadow";
import {
  canyonWalkable,
  canyonHeight,
  CANYON_PATHS,
} from "../packages/shared/canyon";
import {
  hollowWalkable,
  hollowHeight,
  HOLLOW_PATHS,
} from "../packages/shared/hollow";
import { rallyBlocked } from "../packages/shared/rally";
import { buildGrid, findPath } from "../packages/shared/pathfind";
it("keeps every archive and tablet reachable with clear connecting paths", () => {
  const rules = [
    [havenWalkable, groundHeight, 78],
    [meadowWalkable, meadowHeight, 46],
    [canyonWalkable, canyonHeight, 52],
    [hollowWalkable, hollowHeight, 52],
  ] as const;
  ATLAS_CHAPTERS.forEach((h, i) => {
    const [base, ground, extent] = rules[i],
      walk = (x: number, z: number) =>
        base(x, z) &&
        !rallyBlocked(h.region, x, z) &&
        !conservancyBlocked(h.region, x, z) &&
        !atlasBlocked(h.region, x, z),
      grid = buildGrid(walk, extent);
    for (const s of atlasStops(h.region)) {
      expect(walk(...s.point), s.name + " approach").toBe(true);
      expect(
        findPath(grid, [0, 5], s.point, walk),
        s.name + " route",
      ).not.toBeNull();
    }
    for (const path of ATLAS_PATHS[h.region])
      for (let i = 1; i < path.length; i++)
        for (let t = 0; t <= 1; t += 0.05) {
          const a = path[i - 1],
            b = path[i],
            x = a[0] * (1 - t) + b[0] * t,
            z = a[1] * (1 - t) + b[1] * t;
          expect(walk(x, z), `${h.region} path ${x},${z}`).toBe(true);
        }
    const [x, z] = atlasProp(h);
    expect(base(x, z), h.region + " foundation").toBe(true);
    expect(
      Math.abs(ground(x - 1, z) - ground(x + 1, z)),
      h.region + " foundation slope",
    ).toBeLessThan(1);
  });
});

it("keeps Atlas props clear of every existing trail with room for the player", () => {
  const paths = [HAVEN_PATHS, MEADOW_PATHS, CANYON_PATHS, HOLLOW_PATHS];
  const bases = [havenWalkable, meadowWalkable, canyonWalkable, hollowWalkable];
  for (const [index, c] of ATLAS_CHAPTERS.entries()) {
    expect(
      bases[index](...tabletProp(c)),
      c.region + " tablet foundation",
    ).toBe(true);
    for (const path of paths[index])
      for (let i = 1; i < path.length; i++)
        for (let t = 0; t <= 1; t += 0.025) {
          const x = path[i - 1][0] * (1 - t) + path[i][0] * t,
            z = path[i - 1][1] * (1 - t) + path[i][1] * t;
          // Sweep a 0.9-metre corridor, rather than only the exact path center.
          for (let n = 0; n < 8; n++)
            expect(
              atlasBlocked(
                c.region,
                x + 0.45 * Math.cos((n * Math.PI) / 4),
                z + 0.45 * Math.sin((n * Math.PI) / 4),
              ),
              `${c.region} trail near ${x},${z}`,
            ).toBe(false);
        }
  }
});

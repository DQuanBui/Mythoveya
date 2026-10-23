import { expect, it } from "vitest";
import {
  LODGES,
  roomLayout,
  ROOM_SPAWN,
  roomWalkable,
} from "../packages/shared/lodges";
import { havenWalkable } from "../packages/shared/haven";
import { meadowWalkable } from "../packages/shared/meadow";
import { canyonWalkable } from "../packages/shared/canyon";
import { hollowWalkable } from "../packages/shared/hollow";
import { atlasBlocked } from "../packages/shared/atlas";
import { conservancyBlocked } from "../packages/shared/conservancy";
import { rallyBlocked } from "../packages/shared/rally";
import { rescueBlocked } from "../packages/shared/rescue";
import { buildGrid, findPath } from "../packages/shared/pathfind";
import { buildLodge } from "../apps/client/src/lodge-art";
it("connects each exterior lodge doorstep to its regional arrival", () => {
  const rules = [havenWalkable, meadowWalkable, canyonWalkable, hollowWalkable];
  for (const [i, s] of LODGES.entries()) {
    const walk = (x: number, z: number) =>
      rules[i](x, z) &&
      !atlasBlocked(s.region, x, z) &&
      !conservancyBlocked(s.region, x, z) &&
      !rallyBlocked(s.region, x, z) &&
      !rescueBlocked(s.region, x, z);
    expect(walk(...s.point), s.name).toBe(true);
    expect(
      findPath(buildGrid(walk, i === 0 ? 78 : 52), [0, 5], s.point, walk),
      s.name,
    ).not.toBeNull();
  }
});
it("connects every room station around furniture and keeps the companion spawn inside", () => {
  const footprints = new Set<string>();
  for (const site of LODGES) {
    const layout = roomLayout(site.region);
    footprints.add(JSON.stringify(layout.furniture));
    const walk = (x: number, z: number) => roomWalkable(x, z, site.region);
    const grid = buildGrid(walk, 9);
    expect(walk(...layout.host), site.region + " host").toBe(true);
    expect(walk(ROOM_SPAWN[0] - 1, ROOM_SPAWN[1] + 1.5)).toBe(true);
    for (const a of layout.stations)
      for (const b of layout.stations) {
        expect(walk(...a.point), site.region + a.id).toBe(true);
        expect(findPath(grid, a.point, b.point, walk), site.region + a.id + " to " + b.id).not.toBeNull();
      }
    for (const f of layout.furniture) expect(walk(f.x, f.z), f.id).toBe(false);
    for (const [x, z] of [[7, 0], [-7, 0], [0, 8], [NaN, 0], [0, Infinity]])
      expect(walk(x, z)).toBe(false);
  }
  expect(footprints.size).toBe(4);
});
it("builds finite room geometry for every theme and saved decoration", () => {
  for (const s of LODGES)
    for (const keepsake of [undefined, "lantern", "banner"] as const) {
      const g = buildLodge(s, {
        met: true,
        meal: s.recipe,
        helper: { id: "test", species: s.species },
        keepsake,
      });
      g.computeBoundingBox();
      expect(g.boundingBox!.isEmpty()).toBe(false);
      for (const v of g.getAttribute("position").array)
        expect(Number.isFinite(v)).toBe(true);
      g.dispose();
    }
});

import { describe, it, expect } from "vitest";
import { slideStep, HAVEN_HOUSES, houseDoor } from "../packages/shared/haven";
import {
  HAVEN_WILDLIFE,
  HAVEN_TREES,
  resourcesForRegion,
} from "../packages/shared/haven";
import { byId } from "../packages/shared/content";
import {
  HAVEN_PLACES,
  HAVEN_PATHS,
  havenWalkable,
  onIsland,
  inPond,
  onBridge,
  mapPercent,
  pathDistance,
} from "../packages/shared/haven";
describe("Havenreach exploration layout", () => {
  it("keeps all six porches reachable while blocking house walls", () => {
    for (const h of HAVEN_HOUSES) {
      expect(havenWalkable(...h.point), h.id).toBe(false);
      expect(havenWalkable(...houseDoor(h)), h.id).toBe(true);
      expect(pathDistance(...houseDoor(h)), h.id).toBeLessThan(0.01);
    }
  });
  it("slides along obstacles without crossing water or blocked walls", () => {
    expect(slideStep(0.8, 0, 0.4, 0.2, (x) => x < 1)).toEqual([0.8, 0.2]);
    let p: [number, number] = [21, -5];
    for (let i = 0; i < 30; i++)
      p = slideStep(p[0], p[1], 0, 0.2, havenWalkable);
    expect(p[1]).toBeLessThan(-3.7);
    expect(havenWalkable(...p)).toBe(true);
  });
  it("places nine gathering nodes on reachable ground without changing other regions", () => {
    expect(resourcesForRegion("haven")).toHaveLength(9);
    expect(resourcesForRegion("meadow")).toHaveLength(3);
    for (const node of resourcesForRegion("haven"))
      expect(havenWalkable(...node.point), node.id).toBe(true);
  });
  it("uses existing species and keeps woodland off the walking routes", () => {
    expect(HAVEN_WILDLIFE.length).toBeGreaterThan(12);
    for (const resident of HAVEN_WILDLIFE)
      expect(byId[resident.species]).toBeTruthy();
    expect(HAVEN_TREES.length).toBeGreaterThan(100);
    for (const tree of HAVEN_TREES)
      expect(pathDistance(tree.x, tree.z)).toBeGreaterThan(2.7);
  });
  it("keeps every destination and the full walking loop on safe ground", () => {
    for (const p of HAVEN_PLACES)
      expect(havenWalkable(...p.point), p.id).toBe(true);
    for (const path of HAVEN_PATHS)
      for (let i = 1; i < path.length; i++)
        for (let t = 0; t <= 1; t += 0.025) {
          const x = path[i - 1][0] * (1 - t) + path[i][0] * t,
            z = path[i - 1][1] * (1 - t) + path[i][1] * t;
          expect(havenWalkable(x, z), `${x},${z}`).toBe(true);
        }
  });
  it("blocks water and cliffs while leaving a complete bridge crossing", () => {
    expect(inPond(21, -2)).toBe(true);
    expect(havenWalkable(21, -2)).toBe(false);
    for (let x = 12; x <= 30; x += 0.25) {
      expect(onBridge(x, -5)).toBe(true);
      expect(havenWalkable(x, -5)).toBe(true);
    }
    expect(onIsland(55, 0)).toBe(false);
    expect(havenWalkable(32, 0)).toBe(true);
  });
  it("maps enlarged coordinates and preserves smaller regional maps", () => {
    expect(mapPercent(0, "haven")).toBe(50);
    expect(mapPercent(40, "haven")).toBe(90);
    expect(mapPercent(10, "canyon")).toBe(75);
    expect(pathDistance(-22, 22)).toBe(0);
  });
});

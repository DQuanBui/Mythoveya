import { expect, it } from "vitest";
import { LODGES, roomWalkable } from "../packages/shared/lodges";
import { lodgeResidentRoute, residentPose } from "../packages/shared/lodge-life";
import { lineClear } from "../packages/shared/pathfind";

it("keeps each resident's full stroll clear of furniture and inside its room", () => {
  for (const site of LODGES) {
    const route = lodgeResidentRoute(site.region);
    const allowed = (x: number, z: number) => roomWalkable(x, z, site.region);
    expect(route.length, site.region).toBeGreaterThan(5);
    expect(route.at(-1)).toEqual(route[0]);
    for (let i = 1; i < route.length; i++)
      expect(lineClear(route[i - 1], route[i], allowed, 0.05)).toBe(true);
    const positions = new Set<string>();
    let resting = false;
    for (let time = 0; time < 180; time += 0.25) {
      const pose = residentPose(route, time);
      expect(allowed(pose.x, pose.z)).toBe(true);
      expect(Number.isFinite(pose.yaw)).toBe(true);
      positions.add(`${pose.x.toFixed(1)},${pose.z.toFixed(1)}`);
      resting ||= !pose.walking;
    }
    expect(positions.size).toBeGreaterThan(30);
    expect(resting).toBe(true);
  }
});

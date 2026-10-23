import type { Point } from "./haven";
import { roomWalkable } from "./lodges";
import { buildGrid, findPath } from "./pathfind";

/** A closed, collision-checked stroll. Residents share the keeper's clearance. */
export function lodgeResidentRoute(region: string): Point[] {
  const allowed = (x: number, z: number) => roomWalkable(x, z, region);
  const grid = buildGrid(allowed, 9);
  const stops: Point[] = [[-2, -5.5], [3, -5.5], [3, 4], [-3, 4], [-3, -5.5], [-2, -5.5]];
  const route: Point[] = [stops[0]];
  for (let i = 1; i < stops.length; i++) {
    const segment = findPath(grid, route.at(-1)!, stops[i], allowed);
    if (!segment) return [stops[0]];
    route.push(...segment);
  }
  return route;
}
export function residentPose(route: Point[], seconds: number) {
  const durations = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]) / 0.65);
  const total = durations.reduce((sum, n) => sum + n + 2, 0);
  let time = total ? Math.max(0, seconds) % total : 0;
  for (let i = 0; i < durations.length; i++) {
    const travel = durations[i];
    if (time <= travel + 2) {
      const t = travel ? Math.min(1, time / travel) : 1;
      const a = route[i], b = route[i + 1];
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), walking: time < travel };
    }
    time -= travel + 2;
  }
  return { x: route[0][0], z: route[0][1], yaw: 0, walking: false };
}

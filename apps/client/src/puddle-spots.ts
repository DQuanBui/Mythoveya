import { groundHeight, inPond, pathDistance, slopeAt } from "../../../packages/shared/haven";

/** Flat spots on Havenreach's trails where rain collects, found once from the
 * terrain: close to a path, level, low and clear of the pond. */
export function puddleSpots(count = 40) {
  const spots: { x: number; z: number; size: number; turn: number }[] = [];
  for (let i = 0; spots.length < count && i < 4000; i++) {
    const a = i * 2.39996,
      r = 4 + Math.sqrt(i / 4000) * 46,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (pathDistance(x, z) > 1.1 || slopeAt(x, z) > 0.06 || groundHeight(x, z) > 2 || inPond(x, z, 1.5)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue;
    spots.push({ x, z, size: 0.45 + ((i * 7) % 5) * 0.12, turn: (i * 1.3) % Math.PI });
  }
  return spots;
}

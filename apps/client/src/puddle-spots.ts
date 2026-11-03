import { groundHeight, inPond, pathDistance, slopeAt } from "../../../packages/shared/haven";

/** Flat spots on Havenreach's trails where rain collects, found once from the
 * terrain: close to a path, level, low and clear of the pond. */
export function puddleSpots(count = 40) {
  const spots: { x: number; y: number; z: number; size: number; turn: number }[] = [];
  for (let i = 0; spots.length < count && i < 4000; i++) {
    const a = i * 2.39996,
      r = 4 + Math.sqrt(i / 4000) * 46,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (pathDistance(x, z) > 1.1 || slopeAt(x, z) > 0.06 || groundHeight(x, z) > 2 || inPond(x, z, 1.5)) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue;
    spots.push({ x, y: groundHeight(x, z), z, size: 0.45 + ((i * 7) % 5) * 0.12, turn: (i * 1.3) % Math.PI });
  }
  return spots;
}

/** Live puddles: how full they are (0 dry .. 1 full) and where, for footsteps. */
export const puddles = { wet: 0, spots: [] as ReturnType<typeof puddleSpots> };
/** Whether a point is inside a puddle that holds water right now. */
export function inPuddle(x: number, z: number) {
  if (puddles.wet < 0.3) return false;
  const k = Math.sqrt(puddles.wet);
  return puddles.spots.some((s) => Math.hypot((x - s.x) / 1.3, z - s.z) < s.size * k);
}

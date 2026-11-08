// What a companion gets up to while waiting beside its keeper: short outings and
// games that start from where it stands and end back there.
export type Activity = "explore" | "circle" | "dig" | "play" | "look";
export type ActivityMotion = "walk" | "sniff" | "dig" | "play" | "look" | "idle";
export const DURATION: Record<Activity, number> = { explore: 5.5, circle: 3.4, dig: 2.6, play: 2.2, look: 3 };
const ORDER: Activity[] = ["look", "explore", "play", "dig", "circle", "explore", "look", "play"];

/** The n-th activity of a waiting spell. Each creature starts at its own place
 * in the round, and the same thing never comes twice in a row. */
export function pickActivity(n: number, index: number): Activity {
  return ORDER[(n + index) % ORDER.length];
}

type Point = { x: number; z: number };
export type Pose = { x: number; z: number; motion: ActivityMotion; phase: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the companion should be and what it is doing, `p` of the way (0-1)
 * through an activity that began at `from`. `target` is where an outing goes. */
export function activityPose(kind: Activity, p: number, from: Point, keeper: Point, target: Point): Pose {
  p = Math.min(1, Math.max(0, p));
  if (kind === "explore") {
    // Out, a good sniff around, and back again.
    if (p < 0.3) return { x: lerp(from.x, target.x, p / 0.3), z: lerp(from.z, target.z, p / 0.3), motion: "walk", phase: 0 };
    if (p < 0.7) return { ...target, motion: "sniff", phase: (p - 0.3) / 0.4 };
    const back = (p - 0.7) / 0.3;
    return { x: lerp(target.x, from.x, back), z: lerp(target.z, from.z, back), motion: back < 1 ? "walk" : "idle", phase: 0 };
  }
  if (kind === "circle") {
    // One lap round the keeper at the distance it was standing.
    const r = Math.hypot(from.x - keeper.x, from.z - keeper.z),
      a = Math.atan2(from.z - keeper.z, from.x - keeper.x) + p * Math.PI * 2;
    return { x: keeper.x + Math.cos(a) * r, z: keeper.z + Math.sin(a) * r, motion: p < 1 ? "walk" : "idle", phase: 0 };
  }
  return { ...from, motion: kind, phase: p };
}

/** Where an outing heads: something worth a sniff nearby if there is one,
 * otherwise a spot a couple of metres off, away from the keeper. */
export function outingTarget(from: Point, keeper: Point, seed: number, interest?: Point): Point {
  if (interest) {
    const dx = interest.x - from.x,
      dz = interest.z - from.z,
      d = Math.hypot(dx, dz),
      stop = Math.max(0, d - 0.8) / (d || 1);
    return { x: from.x + dx * stop, z: from.z + dz * stop };
  }
  const away = Math.atan2(from.z - keeper.z, from.x - keeper.x),
    a = away + (((seed * 7.31) % 1) - 0.5) * 2.1;
  return { x: from.x + Math.cos(a) * 2.2, z: from.z + Math.sin(a) * 2.2 };
}

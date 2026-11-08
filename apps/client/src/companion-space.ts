import * as T from "three";

const KEEPER_RADIUS = 0.32;
/** How far a creature's body reaches from its centre over the ground, scale included. */
export function bodyReach(model: T.Object3D) {
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model),
    { x, z } = model.position;
  return Math.max(box.max.x - x, x - box.min.x, box.max.z - z, z - box.min.z, 0.2);
}
/** The closest a companion may stand to its keeper, and how far it lets them get
 * before following. Both grow with its body, so a big companion never overlaps. */
export function personalSpace(reach: number, night: boolean) {
  // Reach includes outspread wings and tails, which may brush past; the body may not.
  const min = KEEPER_RADIUS + reach * 0.55 + 0.35;
  return { min, follow: min + (night ? 0.45 : 0.85) };
}
/** How fast a companion gets out of the way: quicker than the keeper walks. */
export const ASIDE_SPEED = 7;
/** A step out of the keeper's way when they come too close, or null. It backs off
 * and veers to one side, so a keeper walking straight at it can pass. */
export function stepAside(dx: number, dz: number, min: number, dt: number): [number, number] | null {
  const d = Math.hypot(dx, dz);
  if (d >= min) return null;
  // Exactly on top of each other: move off to one side.
  if (d < 1e-3) return [Math.min(min, dt * ASIDE_SPEED), 0];
  const step = Math.min(min - d, dt * ASIDE_SPEED),
    ax = -dx / d - (dz / d) * 0.6,
    az = -dz / d + (dx / d) * 0.6,
    n = Math.hypot(ax, az);
  return [(ax / n) * step, (az / n) * step];
}

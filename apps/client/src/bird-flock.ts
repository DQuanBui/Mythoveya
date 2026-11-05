// Small ground birds: they hop and peck around a spot, burst into the air
// when the keeper comes close, and drift back down a while later.
export type Bird = { x: number; z: number; phase: number; fled: number; dx: number; dz: number };
export const FLEE_RADIUS = 3.2,
  FLIGHT = 4,
  AWAY = 22;

export function flock(cx: number, cz: number, count: number, seed: number): Bird[] {
  return Array.from({ length: count }, (_, i) => {
    const a = seed + i * 2.4,
      r = 0.4 + (i % 3) * 0.35;
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, phase: seed * 3 + i * 1.7, fled: -Infinity, dx: 0, dz: 0 };
  });
}

/** Where a bird is at time `t` (seconds), given the keeper's position.
 * Mutates `fled` when the bird takes off or settles again. */
export function birdPose(b: Bird, t: number, kx: number, kz: number) {
  const near = Math.hypot(kx - b.x, kz - b.z);
  if (near < FLEE_RADIUS && t - b.fled > AWAY) {
    b.fled = t;
    const d = Math.max(near, 0.001);
    b.dx = (b.x - kx) / d;
    b.dz = (b.z - kz) / d;
  }
  const since = t - b.fled;
  if (since < FLIGHT) {
    // Up and away, beating hard, then out of sight.
    const k = since / FLIGHT;
    return { x: b.x + b.dx * k * 9, lift: k * 7 + Math.sin(k * Math.PI) * 0.5, z: b.z + b.dz * k * 9, yaw: Math.atan2(b.dx, b.dz), peck: 0, flying: true, visible: true };
  }
  if (since < AWAY) return { x: b.x, lift: 0, z: b.z, yaw: 0, peck: 0, flying: false, visible: false };
  // Back on the ground: little hops, a turn now and then, and pecks.
  const s = t + b.phase,
    hop = Math.max(0, Math.sin(s * 3.1)) * 0.06 * (Math.sin(s * 0.7) > 0.2 ? 1 : 0),
    peck = Math.max(0, Math.sin(s * 5.3)) ** 6;
  return { x: b.x + Math.sin(s * 0.4) * 0.15, lift: hop, z: b.z + Math.cos(s * 0.33) * 0.15, yaw: Math.sin(s * 0.5) * 2, peck, flying: false, visible: true };
}

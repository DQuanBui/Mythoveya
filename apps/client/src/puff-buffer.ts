// Short-lived soft puffs: frosty breath in the cold, and dust or powder
// kicked up by a sprinting keeper, and the sparkles a shimmering companion trails. A ring buffer the
// Explorer writes and Puffs.tsx draws as camera-facing dots.
export type PuffKind = "breath" | "dust" | "snow" | "sparkle" | "drop";
export const MAX_PUFFS = 32;
export const PUFF_LOOK: Record<PuffKind, { color: string; life: number; size: number; rise: number; drift: number }> = {
  breath: { color: "#eef6ff", life: 1.4, size: 0.34, rise: 0.25, drift: 0.45 },
  dust: { color: "#d9c4a0", life: 0.9, size: 0.42, rise: 0.18, drift: 0.35 },
  snow: { color: "#f6fafd", life: 0.8, size: 0.36, rise: 0.12, drift: 0.3 },
  sparkle: { color: "#fff0a8", life: 0.9, size: 0.16, rise: 0.35, drift: 0.08 },
  // Droplets flung off a wet companion fly out and fall.
  drop: { color: "#cfe9f5", life: 0.6, size: 0.12, rise: -0.45, drift: 0.7 },
};
type Puff = { x: number; y: number; z: number; dx: number; dz: number; t: number; kind: PuffKind };
const puffs: Puff[] = [];
/** Emit a puff at a point, drifting along (dx, dz). */
export function emitPuff(x: number, y: number, z: number, dx: number, dz: number, t: number, kind: PuffKind) {
  puffs.push({ x, y, z, dx, dz, t, kind });
  if (puffs.length > MAX_PUFFS) puffs.shift();
}
export const recentPuffs = (): readonly Puff[] => puffs;

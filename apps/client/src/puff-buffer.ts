// Short-lived soft puffs: frosty breath in the cold. A ring buffer the
// Explorer writes and Puffs.tsx draws as camera-facing dots.
export type PuffKind = "breath";
export const MAX_PUFFS = 32;
export const PUFF_LOOK: Record<PuffKind, { color: string; life: number; size: number; rise: number; drift: number }> = {
  breath: { color: "#eef6ff", life: 1.4, size: 0.34, rise: 0.25, drift: 0.45 },
};
type Puff = { x: number; y: number; z: number; dx: number; dz: number; t: number; kind: PuffKind };
const puffs: Puff[] = [];
/** Emit a puff at a point, drifting along (dx, dz). */
export function emitPuff(x: number, y: number, z: number, dx: number, dz: number, t: number, kind: PuffKind) {
  puffs.push({ x, y, z, dx, dz, t, kind });
  if (puffs.length > MAX_PUFFS) puffs.shift();
}
export const recentPuffs = (): readonly Puff[] => puffs;

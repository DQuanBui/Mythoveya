import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { softDot } from "./Weather";

// Short-lived soft puffs: frosty breath in the cold. A ring buffer the
// Explorer writes and this component draws as camera-facing dots.
export type PuffKind = "breath";
const MAX = 32;
const LOOK: Record<PuffKind, { color: string; life: number; size: number; rise: number; drift: number }> = {
  breath: { color: "#eef6ff", life: 1.4, size: 0.34, rise: 0.25, drift: 0.45 },
};
type Puff = { x: number; y: number; z: number; dx: number; dz: number; t: number; kind: PuffKind };
const puffs: Puff[] = [];
/** Emit a puff at a point, drifting along (dx, dz). */
export function emitPuff(x: number, y: number, z: number, dx: number, dz: number, t: number, kind: PuffKind) {
  puffs.push({ x, y, z, dx, dz, t, kind });
  if (puffs.length > MAX) puffs.shift();
}
export const recentPuffs = (): readonly Puff[] => puffs;

export function Puffs() {
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: softDot(), transparent: true, opacity: 0.55, depthWrite: false }),
      MAX,
    );
    m.frustumCulled = false;
    m.name = "keeper-puffs";
    return m;
  }, []);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      const mat = mesh.material as T.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []),
    c = useMemo(() => new T.Color(), []);
  useFrame(({ clock, camera }) => {
    let n = 0;
    if (!settings.reduced)
      for (const p of puffs) {
        const look = LOOK[p.kind],
          k = (clock.elapsedTime - p.t) / look.life;
        if (k < 0 || k > 1) continue;
        // Billow out quickly, then thin away as it drifts and rises.
        o.position.set(p.x + p.dx * look.drift * k, p.y + look.rise * k, p.z + p.dz * look.drift * k);
        o.quaternion.copy(camera.quaternion);
        o.scale.setScalar(look.size * Math.sqrt(k) * (1 - k * k) * 1.6 + 0.02);
        o.updateMatrix();
        mesh.setMatrixAt(n, o.matrix);
        mesh.setColorAt(n++, c.set(look.color));
      }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

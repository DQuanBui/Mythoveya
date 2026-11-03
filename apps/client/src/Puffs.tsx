import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { softDot } from "./glyphs";
import { MAX_PUFFS as MAX, PUFF_LOOK as LOOK, recentPuffs } from "./puff-buffer";
import { perf } from "./adaptive";

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
    if (!settings.reduced && !perf.lite)
      for (const p of recentPuffs()) {
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

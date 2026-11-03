import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { softDot } from "./glyphs";
import { worldFocus } from "./village-materials";

// Each region's air: embers rising off Emberglass's basalt, pollen drifting
// through Whisperleaf. Motes live in a box around the keeper and wrap.
const AIR: Record<string, { color: string; size: number; rise: number; sway: number; additive: boolean }> = {
  canyon: { color: "#ff6a1f", size: 0.2, rise: 0.55, sway: 0.25, additive: true },
  meadow: { color: "#f6e7a0", size: 0.15, rise: 0.08, sway: 0.45, additive: false },
};
const BOX = 16,
  HIGH = 6;

export function RegionMotes({ region }: { region: string }) {
  const air = AIR[region],
    count = settings.quality === "Low" ? 16 : 48;
  const mesh = useMemo(() => {
    if (!air) return null;
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: softDot(), color: air.color, transparent: true, opacity: 0.85, depthWrite: false, blending: air.additive ? T.AdditiveBlending : T.NormalBlending }),
      count,
    );
    m.frustumCulled = false;
    m.name = `${region}-motes`;
    return m;
  }, [air, count, region]);
  useEffect(
    () => () => {
      if (!mesh) return;
      mesh.geometry.dispose();
      const mat = mesh.material as T.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock, camera }) => {
    if (!mesh || !air) return;
    mesh.visible = !settings.reduced;
    if (!mesh.visible) return;
    const t = clock.elapsedTime,
      wrap = (v: number, c: number) => c + ((((v - c + BOX / 2) % BOX) + BOX) % BOX) - BOX / 2;
    for (let i = 0; i < count; i++) {
      const sx = (i * 7.31) % BOX,
        sz = (i * 4.17 + i * i * 0.13) % BOX,
        y = ((i * 1.37 + t * air.rise * (0.6 + (i % 5) * 0.15)) % HIGH) + 0.2;
      o.position.set(
        wrap(sx + Math.sin(t * 0.6 + i) * air.sway, worldFocus.x),
        worldFocus.y + y,
        wrap(sz + Math.cos(t * 0.5 + i * 1.3) * air.sway, worldFocus.z),
      );
      o.quaternion.copy(camera.quaternion);
      // Fade in at the bottom and out at the top of the box; embers flicker.
      const life = Math.sin((y / HIGH) * Math.PI),
        flicker = air.additive ? 0.7 + 0.3 * Math.sin(t * 9 + i * 2.1) : 1;
      o.scale.setScalar(air.size * life * flicker * (0.7 + (i % 3) * 0.25));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh ? <primitive object={mesh} /> : null;
}

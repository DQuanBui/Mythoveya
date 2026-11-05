import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";
import { perf } from "./adaptive";
import { islandHour } from "./daytime";
import { softDot } from "./glyphs";
import { worldFocus } from "./village-materials";
import { weatherFx } from "./Weather";
import { mistAt } from "./mist";

const BOX = 22;
/** Soft patches of mist lying low over the ground around the keeper at dawn. */
export function MorningMist({ ground }: { ground: (x: number, z: number) => number }) {
  const count = settings.quality === "Low" ? 6 : 14;
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ map: softDot(), color: "#e4edf1", transparent: true, opacity: 0, depthWrite: false }),
      count,
    );
    m.name = "morning-mist";
    m.frustumCulled = false;
    m.renderOrder = 2;
    return m;
  }, [count]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      const mat = mesh.material as T.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock }) => {
    const thick = settings.daynight ? mistAt(islandHour()) * (1 - weatherFx.rain) : 0;
    mesh.visible = !perf.lite && thick > 0.02;
    if (!mesh.visible) return;
    (mesh.material as T.MeshBasicMaterial).opacity = 0.62 * thick;
    const t = settings.reduced ? 0 : clock.elapsedTime,
      wrap = (v: number, c: number) => c + ((((v - c + BOX / 2) % BOX) + BOX) % BOX) - BOX / 2;
    for (let i = 0; i < count; i++) {
      const x = wrap((i * 7.9) % BOX + t * 0.12, worldFocus.x),
        z = wrap((i * 5.3 + i * i * 0.7) % BOX + Math.sin(t * 0.05 + i) * 0.8, worldFocus.z);
      o.position.set(x, ground(x, z) + 0.35 + (i % 3) * 0.12, z);
      o.rotation.set(0, i * 1.1, 0);
      o.scale.set(6 + (i % 4) * 1.5, 1, 4 + (i % 3) * 1.2);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

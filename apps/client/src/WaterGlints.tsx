import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { settings } from "./audio";
import { daylight, islandHour } from "./daytime";

const hash = (n: number) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};
/** Sun glints that wink on and off across a water ellipse: bright and warm
 * by day, a few faint silver ones at night. Each glint reappears somewhere
 * new after it fades. */
export function WaterGlints({ x, z, rx, rz, y = 0.05 }: { x: number; z: number; rx: number; rz: number; y?: number }) {
  const count = settings.quality === "Low" ? 14 : 44;
  const mesh = useMemo(() => {
    const star = mergeGeometries([new T.PlaneGeometry(0.7, 0.05), new T.PlaneGeometry(0.04, 0.16), new T.PlaneGeometry(0.16, 0.1)])!.rotateX(-Math.PI / 2);
    const m = new T.InstancedMesh(
      star,
      new T.MeshBasicMaterial({ color: "#fff4d2", transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }),
      count,
    );
    m.name = "water-glints";
    m.frustumCulled = false;
    return m;
  }, [count]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []),
    warm = useMemo(() => new T.Color("#fff4d2"), []),
    cool = useMemo(() => new T.Color("#c9dcff"), []);
  useFrame(({ clock }) => {
    mesh.visible = !settings.reduced;
    if (!mesh.visible) return;
    const day = daylight(islandHour()).day,
      material = mesh.material as T.MeshBasicMaterial,
      t = clock.elapsedTime;
    material.opacity = 0.25 + day * 0.65;
    material.color.copy(cool).lerp(warm, day);
    for (let i = 0; i < count; i++) {
      const cycle = t * (0.45 + hash(i) * 0.4) + hash(i + 7),
        n = Math.floor(cycle),
        k = cycle - n,
        // Fewer glints show at night.
        on = day > 0.3 || i % 4 === 0 ? Math.pow(Math.max(0, Math.sin(k * Math.PI)), 3) : 0,
        a = hash(i * 13 + n) * Math.PI * 2,
        r = Math.sqrt(hash(i * 29 + n * 3)) * 0.88;
      o.position.set(x + Math.cos(a) * rx * r, y, z + Math.sin(a) * rz * r);
      o.rotation.set(0, hash(i + n) * 0.6 - 0.3, 0);
      o.scale.setScalar(on * (0.6 + hash(i * 3) * 0.7));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

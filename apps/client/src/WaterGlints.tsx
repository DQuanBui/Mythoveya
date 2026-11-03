import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { settings } from "./audio";
import { daylight, islandHour } from "./daytime";
import { weatherFx } from "./Weather";
import { worldFocus } from "./village-materials";

const FAR = 60;
const hash = (n: number) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};
/** Sun glints that wink on and off across a water ellipse: bright and warm
 * by day, a few faint silver ones at night, and raindrop rings in the rain. Each glint reappears somewhere
 * new after it fades. */
export function WaterGlints({
  x: cx,
  z: cz,
  rx,
  rz,
  y = 0.05,
  max = 44,
  color = "#fff4d2",
  follow,
}: {
  x: number;
  z: number;
  rx: number;
  rz: number;
  y?: number;
  max?: number;
  color?: string;
  /** Sparkle on the ground around the keeper instead (e.g. snow), at this height. */
  follow?: (x: number, z: number) => number;
}) {
  // Small ponds get fewer glints; Low quality about a third.
  const count = settings.quality === "Low" ? Math.max(3, Math.round(max / 3)) : max;
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
  // Raindrops ring the surface while it rains.
  const drops = Math.max(4, Math.round(count / 3)),
    rings = useMemo(() => {
      const m = new T.InstancedMesh(
        new T.RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2),
        new T.MeshBasicMaterial({ color: "#e4f2f6", transparent: true, opacity: 0.5, depthWrite: false }),
        drops,
      );
      m.name = "rain-ripples";
      m.frustumCulled = false;
      return m;
    }, [drops]);
  useEffect(
    () => () => {
      for (const m of [mesh, rings]) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
    },
    [mesh, rings],
  );
  const o = useMemo(() => new T.Object3D(), []),
    warm = useMemo(() => new T.Color(color), [color]),
    cool = useMemo(() => new T.Color("#c9dcff"), []);
  useFrame(({ clock, camera }) => {
    const x = follow ? worldFocus.x : cx,
      z = follow ? worldFocus.z : cz;
    // Out of sight across the island, the water needs no glints.
    mesh.visible = !settings.reduced && Math.hypot(camera.position.x - x, camera.position.z - z) < FAR + Math.max(rx, rz);
    const rain = weatherFx.snow ? 0 : weatherFx.rain;
    rings.visible = mesh.visible && rain > 0.15;
    if (rings.visible) {
      (rings.material as T.MeshBasicMaterial).opacity = 0.5 * Math.min(1, rain * 1.5);
      for (let i = 0; i < drops; i++) {
        const cycle = clock.elapsedTime * 1.6 + i / drops,
          n = Math.floor(cycle),
          k = cycle - n,
          a = hash(i * 31 + n) * Math.PI * 2,
          r = Math.sqrt(hash(i * 17 + n * 5)) * 0.9;
        o.position.set(x + Math.cos(a) * rx * r, y, z + Math.sin(a) * rz * r);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(0.05 + k * 0.35);
        o.updateMatrix();
        rings.setMatrixAt(i, o.matrix);
      }
      rings.instanceMatrix.needsUpdate = true;
    }
    if (!mesh.visible) return;
    const day = daylight(islandHour()).day,
      material = mesh.material as T.MeshBasicMaterial,
      t = clock.elapsedTime;
    // Overcast skies dull the glints.
    material.opacity = (0.25 + day * 0.65) * (1 - rain * 0.8);
    material.color.copy(cool).lerp(warm, day);
    for (let i = 0; i < count; i++) {
      const cycle = t * (0.45 + hash(i) * 0.4) + hash(i + 7),
        n = Math.floor(cycle),
        k = cycle - n,
        // Fewer glints show at night.
        on = day > 0.3 || i % 4 === 0 ? Math.pow(Math.max(0, Math.sin(k * Math.PI)), 3) : 0,
        a = hash(i * 13 + n) * Math.PI * 2,
        r = Math.sqrt(hash(i * 29 + n * 3)) * 0.88;
      const gx = x + Math.cos(a) * rx * r,
        gz = z + Math.sin(a) * rz * r;
      o.position.set(gx, follow ? follow(gx, gz) + y : y, gz);
      o.rotation.set(0, hash(i + n) * 0.6 - 0.3, 0);
      o.scale.setScalar(on * (0.6 + hash(i * 3) * 0.7));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <primitive object={mesh} />
      <primitive object={rings} />
    </>
  );
}

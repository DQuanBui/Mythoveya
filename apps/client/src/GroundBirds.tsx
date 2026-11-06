import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groundHeight, havenWalkable } from "../../../packages/shared/haven";
import { birdPose, flock } from "./bird-flock";
import { audio, settings } from "./audio";
import { daylight, islandHour } from "./daytime";
import { perf } from "./adaptive";
import { worldFocus } from "./village-materials";
import { weatherFx } from "./Weather";

const paint = (g: T.BufferGeometry, color: string) => {
  const c = new T.Color(color),
    n = g.attributes.position.count;
  g.setAttribute("color", new T.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return g.index ? g.toNonIndexed() : g;
};
// Where little flocks gather: the village green, the clearing and the orchard.
const SPOTS: [number, number][] = [
  [3, 9],
  [-4, 12],
  [9, 23],
  [-19, 20],
];

/** Sparrow-sized birds pecking about Havenreach by day; they scatter as the keeper comes near. */
export function GroundBirds() {
  const birds = useMemo(
    () => SPOTS.filter(([x, z]) => havenWalkable(x, z)).flatMap(([x, z], i) => flock(x, z, settings.quality === "Low" ? 2 : 4, i * 1.9 + 0.7)),
    [],
  );
  const mesh = useMemo(() => {
    const geo = mergeGeometries([
      paint(new T.SphereGeometry(0.09, 8, 6).scale(1, 0.85, 1.35), "#8a6a4e"),
      paint(new T.SphereGeometry(0.06, 8, 6).translate(0, 0.07, 0.09), "#6d5440"),
      paint(new T.ConeGeometry(0.018, 0.06, 4).rotateX(Math.PI / 2).translate(0, 0.065, 0.16), "#e3b04b"),
      paint(new T.BoxGeometry(0.09, 0.015, 0.12).translate(0, 0.03, -0.15), "#5a4334"),
    ])!;
    const m = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), birds.length);
    m.name = "ground-birds";
    m.castShadow = true;
    m.frustumCulled = false;
    return m;
  }, [birds]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []),
    flutter = useRef(-9);
  useFrame(({ clock }) => {
    // Birds roost at night and shelter from the rain.
    mesh.visible = !perf.lite && daylight(islandHour()).glow < 0.5 && weatherFx.rain < 0.3;
    if (!mesh.visible) return;
    const t = clock.elapsedTime;
    birds.forEach((b, i) => {
      const p = birdPose(b, t, worldFocus.x, worldFocus.z),
        calm = settings.reduced && !p.flying;
      // A rush of wings as a flock takes off, once per burst.
      if (t - b.fled < 0.1 && t - flutter.current > 3) {
        flutter.current = t;
        audio.cue("flutter");
      }
      o.position.set(p.x, groundHeight(p.x, p.z) + (calm ? 0 : p.lift), p.z);
      o.rotation.set(calm ? 0 : p.flying ? -0.4 : p.peck * 0.7, calm ? 0 : p.yaw, p.flying ? Math.sin(t * 30) * 0.2 : 0);
      o.scale.setScalar(p.visible ? 1 : 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

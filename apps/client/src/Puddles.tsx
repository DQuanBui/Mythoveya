import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { puddleSpots, puddles } from "./puddle-spots";
import { settings } from "./audio";
import { weatherFx } from "./Weather";
import { perf } from "./adaptive";

/** Puddles that fill on the trails while it rains and slowly dry afterwards. */
export function Puddles() {
  const spots = useMemo(() => (puddles.spots = puddleSpots(settings.quality === "Low" ? 16 : 40)), []);
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.CircleGeometry(1, 18).rotateX(-Math.PI / 2),
      new T.MeshStandardMaterial({ color: "#6f8a94", roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.45, depthWrite: false }),
      spots.length,
    );
    m.name = "haven-puddles";
    m.receiveShadow = true;
    m.renderOrder = 1;
    return m;
  }, [spots]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
    },
    [mesh],
  );
  const wet = useRef(0),
    o = useMemo(() => new T.Object3D(), []);
  useFrame((_, dt) => {
    // Fill over ~20 s of rain, dry over about a minute.
    const rain = weatherFx.snow ? 0 : weatherFx.rain,
      target = rain > 0.3 ? 1 : 0;
    wet.current += (target - wet.current) * Math.min(1, Math.min(dt, 0.1) * (target ? 0.05 : 0.018));
    puddles.wet = wet.current;
    mesh.visible = wet.current > 0.02 && !perf.lite;
    if (!mesh.visible) return;
    spots.forEach((s, i) => {
      o.position.set(s.x, s.y + 0.035, s.z);
      o.rotation.set(0, s.turn, 0);
      const k = s.size * Math.sqrt(wet.current);
      o.scale.set(k * 1.3, 1, k);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

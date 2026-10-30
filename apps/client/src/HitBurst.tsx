import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { settings } from "./audio";

// The attacker's element tints each impact.
const TINT: Record<string, string> = {
  Flame: "#ff8a3d",
  Tide: "#6fd0e8",
  Grove: "#8fdc6a",
  Stone: "#d8c08a",
  Storm: "#ffe45c",
  Frost: "#c8f0ff",
  Light: "#fff1a6",
  Shadow: "#b98cff",
};
const SPARKS = 8;

/** A short impact on a creature that takes damage: a flash, an expanding
 * ring and sparks thrown outward, timed from the battle event. */
export function HitBurst({ at, duration, element, height }: { at: number; duration: number; element: string; height: number }) {
  const parts = useMemo(() => {
    const color = new T.Color(TINT[element] || "#ffffff");
    const mat = (o: number) =>
      new T.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    return {
      flash: new T.Mesh(new T.SphereGeometry(0.35, 12, 8), mat(0.8)),
      ring: new T.Mesh(new T.TorusGeometry(0.4, 0.04, 6, 32), mat(0.9)),
      sparks: new T.InstancedMesh(new T.OctahedronGeometry(0.06, 0), mat(1), SPARKS),
      dirs: Array.from({ length: SPARKS }, (_, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        return new T.Vector3(Math.cos(a), 0.35 + (i % 3) * 0.25, Math.sin(a)).normalize();
      }),
    };
  }, [element]);
  useEffect(
    () => () => {
      for (const m of [parts.flash, parts.ring, parts.sparks]) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
    },
    [parts],
  );
  const group = useRef<T.Group>(null),
    o = useMemo(() => new T.Object3D(), []);
  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    // The hit lands just before half way through the event and lasts ~0.4 s.
    const t = ((Date.now() - at) / duration - 0.45) / 0.3;
    g.visible = t >= 0 && t <= 1;
    if (!g.visible) return;
    const fade = 1 - t,
      calm = settings.reduced ? 0.4 : 1;
    parts.flash.scale.setScalar((0.45 + t * 0.6) * calm);
    (parts.flash.material as T.MeshBasicMaterial).opacity = 0.4 * fade * fade;
    parts.ring.scale.setScalar((0.5 + t * 1.6) * calm);
    parts.ring.quaternion.copy(camera.quaternion);
    (parts.ring.material as T.MeshBasicMaterial).opacity = 0.9 * fade;
    parts.sparks.visible = !settings.reduced;
    parts.dirs.forEach((d, i) => {
      o.position.copy(d).multiplyScalar(0.3 + t * 1.1);
      o.position.y -= t * t * 0.5;
      o.rotation.set(t * 6 + i, t * 4, 0);
      o.scale.setScalar(fade);
      o.updateMatrix();
      parts.sparks.setMatrixAt(i, o.matrix);
    });
    parts.sparks.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group} position={[0, height, 0]} visible={false} renderOrder={10}>
      <primitive object={parts.flash} />
      <primitive object={parts.ring} />
      <primitive object={parts.sparks} />
    </group>
  );
}

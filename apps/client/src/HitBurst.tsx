import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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

const MOTES = 10;
/** Support feedback on an ally: plus-shaped motes spiral up from a green
 * ground ring when it is healed, and a lattice bubble pops up around it
 * when it gains a shield. Timed like {@link HitBurst}. */
export function SupportGlow({ at, duration, heal, shield, height }: { at: number; duration: number; heal: boolean; shield: boolean; height: number }) {
  const parts = useMemo(() => {
    const mat = (color: string, o: number, wireframe = false) =>
      new T.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending, wireframe });
    const plus = mergeGeometries([new T.BoxGeometry(0.2, 0.065, 0.05), new T.BoxGeometry(0.065, 0.2, 0.05)])!;
    return {
      ring: new T.Mesh(new T.RingGeometry(0.5, 0.62, 32), mat("#4dff7c", 0.8)),
      motes: new T.InstancedMesh(new T.OctahedronGeometry(0.1, 0), mat("#8dff6a", 1), MOTES),
      crosses: [0, 1].map(() => new T.Mesh(plus, mat("#6dff8e", 1))),
      bubble: new T.Mesh(new T.SphereGeometry(1, 20, 14), mat("#8fd8ff", 0.16)),
      lattice: new T.Mesh(new T.IcosahedronGeometry(1.01, 1), mat("#c9f0ff", 0.45, true)),
    };
  }, []);
  useEffect(
    () => () => {
      for (const m of [parts.ring, parts.motes, parts.bubble, parts.lattice, ...parts.crosses]) {
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
    const t = ((Date.now() - at) / duration - 0.42) / 0.5;
    g.visible = t >= 0 && t <= 1;
    if (!g.visible) return;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25,
      calm = settings.reduced;
    parts.ring.visible = parts.motes.visible = heal;
    parts.crosses.forEach((c, i) => {
      c.visible = heal;
      c.position.set((i ? 0.32 : -0.28), height * 0.9 + t * 0.9 + i * 0.2, 0.1);
      c.quaternion.copy(camera.quaternion);
      (c.material as T.MeshBasicMaterial).opacity = fade;
    });
    if (heal) {
      parts.ring.scale.setScalar(calm ? 1 : 0.7 + t * 0.6);
      (parts.ring.material as T.MeshBasicMaterial).opacity = 0.75 * fade;
      for (let i = 0; i < MOTES; i++) {
        const k = (t * 1.4 + i / MOTES) % 1,
          a = i * 2.4 + (calm ? 0 : t * 5);
        o.position.set(Math.cos(a) * 0.45 * (1 - k * 0.4), k * height * 1.8, Math.sin(a) * 0.45 * (1 - k * 0.4));
        o.scale.setScalar(Math.sin(k * Math.PI) * fade);
        o.updateMatrix();
        parts.motes.setMatrixAt(i, o.matrix);
      }
      parts.motes.instanceMatrix.needsUpdate = true;
    }
    parts.bubble.visible = parts.lattice.visible = shield;
    if (shield) {
      // Pops slightly past full size, settles, then fades.
      const pop = calm ? 1 : t < 0.2 ? Math.sin((t / 0.2) * Math.PI * 0.6) / Math.sin(Math.PI * 0.6) * 1.08 : 1 + 0.08 * Math.max(0, 1 - (t - 0.2) * 5),
        r = height * 1.25 * pop;
      parts.bubble.scale.setScalar(r);
      parts.lattice.scale.setScalar(r);
      parts.bubble.position.y = parts.lattice.position.y = height * 0.75;
      parts.lattice.rotation.y = calm ? 0 : t * 1.5;
      (parts.bubble.material as T.MeshBasicMaterial).opacity = 0.16 * fade;
      (parts.lattice.material as T.MeshBasicMaterial).opacity = 0.45 * fade;
    }
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} />
      <primitive object={parts.motes} />
      {parts.crosses.map((c, i) => <primitive key={i} object={c} />)}
      <primitive object={parts.bubble} />
      <primitive object={parts.lattice} />
    </group>
  );
}

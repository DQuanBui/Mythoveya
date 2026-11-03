import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { softDot } from "./glyphs";
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
// Each element throws its own debris: shape, stretch and how it falls (a
// negative fall rises, like flame tongues).
const DEBRIS: Record<string, { geo: () => T.BufferGeometry; stretch: [number, number, number]; fall: number }> = {
  Flame: { geo: () => new T.ConeGeometry(0.06, 0.18, 5), stretch: [1, 1, 1], fall: -0.35 },
  Tide: { geo: () => new T.SphereGeometry(0.05, 6, 4), stretch: [1, 1.4, 1], fall: 0.9 },
  Grove: { geo: () => new T.SphereGeometry(0.07, 6, 4), stretch: [1, 0.25, 0.6], fall: 0.25 },
  Stone: { geo: () => new T.DodecahedronGeometry(0.06, 0), stretch: [1, 1, 1], fall: 1.3 },
  Storm: { geo: () => new T.BoxGeometry(0.025, 0.2, 0.025), stretch: [1, 1, 1], fall: 0 },
  Frost: { geo: () => new T.OctahedronGeometry(0.06, 0), stretch: [0.6, 2, 0.6], fall: 0.5 },
  Light: { geo: () => new T.OctahedronGeometry(0.05, 0), stretch: [0.4, 2.6, 0.4], fall: 0 },
  Shadow: { geo: () => new T.SphereGeometry(0.06, 6, 4), stretch: [1, 1, 1], fall: -0.15 },
};

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
      sparks: new T.InstancedMesh(DEBRIS[element]?.geo() || new T.OctahedronGeometry(0.06, 0), mat(1), SPARKS),
      debris: DEBRIS[element] || { stretch: [1, 1, 1] as [number, number, number], fall: 0.5 },
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
    const { stretch, fall } = parts.debris;
    parts.dirs.forEach((d, i) => {
      o.position.copy(d).multiplyScalar(0.3 + t * 1.1);
      o.position.y -= t * t * fall;
      // Leaves flutter; shards and bolts point the way they fly.
      if (element === "Grove") o.position.x += Math.sin(t * 14 + i) * 0.06;
      if (element === "Frost" || element === "Light" || element === "Storm" || element === "Flame") o.lookAt(o.position.clone().add(d)), o.rotateX(Math.PI / 2);
      else o.rotation.set(t * 6 + i, t * 4, 0);
      o.scale.set(stretch[0] * fade, stretch[1] * fade, stretch[2] * fade);
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

const CONFETTI = ["#ffd166", "#ef7b6e", "#7fd6c2", "#9fb7ff", "#f7a8d8", "#b6e388"];
/** A burst of paper confetti that flutters down over the winning team. */
export function Confetti({ center, count = 70 }: { center: [number, number, number]; count?: number }) {
  const parts = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(0.09, 0.14),
      new T.MeshBasicMaterial({ side: T.DoubleSide, transparent: true, depthWrite: false }),
      count,
    );
    m.frustumCulled = false;
    const color = new T.Color();
    const seeds = Array.from({ length: count }, (_, i) => {
      m.setColorAt(i, color.set(CONFETTI[i % CONFETTI.length]));
      const a = Math.random() * Math.PI * 2,
        speed = 1.2 + Math.random() * 2.2;
      return { vx: Math.cos(a) * speed, vz: Math.sin(a) * speed * 0.6, vy: 4 + Math.random() * 3, spin: 3 + Math.random() * 6, phase: Math.random() * 6 };
    });
    return { m, seeds, born: performance.now() };
  }, [count]);
  useEffect(
    () => () => {
      parts.m.geometry.dispose();
      (parts.m.material as T.Material).dispose();
    },
    [parts],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(() => {
    const t = (performance.now() - parts.born) / 1000;
    parts.m.visible = !settings.reduced && t < 4.5;
    if (!parts.m.visible) return;
    (parts.m.material as T.MeshBasicMaterial).opacity = Math.min(1, (4.5 - t) / 0.8);
    parts.seeds.forEach((s, i) => {
      // A quick upward pop, then a slow, swaying fall once air drag takes over.
      const up = Math.min(t, 0.6),
        fall = Math.max(0, t - 0.6);
      o.position.set(
        center[0] + s.vx * up + Math.sin(t * 3 + s.phase) * 0.25 * Math.min(1, fall),
        center[1] + s.vy * up - 4.9 * up * up - fall * 0.9,
        center[2] + s.vz * up,
      );
      o.rotation.set(t * s.spin, t * s.spin * 0.6, s.phase);
      o.updateMatrix();
      parts.m.setMatrixAt(i, o.matrix);
    });
    parts.m.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={parts.m} />;
}

/** A glowing arc that grows from a supporting caster to the ally it heals or
 * shields, with a bright mote racing along it. Timed from the battle event. */
export function SupportLink({ from, to, at, duration, color }: { from: [number, number, number]; to: [number, number, number]; at: number; duration: number; color: string }) {
  const parts = useMemo(() => {
    const a = new T.Vector3(...from).setY(0.9),
      b = new T.Vector3(...to).setY(0.9),
      mid = a.clone().lerp(b, 0.5).setY(0.9 + 0.35 * a.distanceTo(b));
    const curve = new T.QuadraticBezierCurve3(a, mid, b),
      mat = (o: number) => new T.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending });
    return {
      curve,
      tube: new T.Mesh(new T.TubeGeometry(curve, 40, 0.045, 6), mat(0.8)),
      mote: new T.Mesh(new T.SphereGeometry(0.12, 10, 8), mat(1)),
    };
    // Positions arrive as fresh arrays on every battle tick; key on their values.
  }, [from.join(), to.join(), color]);
  useEffect(
    () => () => {
      for (const m of [parts.tube, parts.mote]) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
    },
    [parts],
  );
  const group = useRef<T.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = ((Date.now() - at) / duration - 0.12) / 0.55;
    g.visible = t >= 0 && t <= 1;
    if (!g.visible) return;
    const grow = settings.reduced ? 1 : Math.min(1, t / 0.55),
      fade = t < 0.7 ? 1 : (1 - t) / 0.3,
      index = parts.tube.geometry.index!;
    parts.tube.geometry.setDrawRange(0, Math.floor((index.count / 6) * grow) * 6);
    (parts.tube.material as T.MeshBasicMaterial).opacity = 0.7 * fade;
    parts.mote.visible = !settings.reduced && grow < 1;
    parts.curve.getPoint(grow, parts.mote.position);
  });
  return (
    <group ref={group} visible={false} renderOrder={9}>
      <primitive object={parts.tube} />
      <primitive object={parts.mote} />
    </group>
  );
}

/** The moment before an ultimate: a ring of light opens under the caster,
 * a column rises through it and sparks stream upward, in its element colour. */
export function ChargeAura({ at, duration, element, height }: { at: number; duration: number; element: string; height: number }) {
  const parts = useMemo(() => {
    const color = new T.Color(TINT[element] || "#ffffff"),
      mat = (o: number, side: T.Side = T.FrontSide) =>
        new T.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending, side });
    return {
      ring: new T.Mesh(new T.RingGeometry(0.7, 0.85, 40).rotateX(-Math.PI / 2), mat(0.9)),
      rune: new T.Mesh(new T.RingGeometry(0.45, 0.5, 6).rotateX(-Math.PI / 2), mat(0.7)),
      column: new T.Mesh(new T.CylinderGeometry(0.55, 0.7, 1, 24, 1, true), mat(0.25, T.DoubleSide)),
      sparks: new T.InstancedMesh(new T.OctahedronGeometry(0.06, 0), mat(1), 12),
    };
  }, [element]);
  useEffect(
    () => () => {
      for (const m of Object.values(parts)) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
      }
    },
    [parts],
  );
  const group = useRef<T.Group>(null),
    o = useMemo(() => new T.Object3D(), []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // The first 40% of the ultimate, before the effect flies.
    const t = (Date.now() - at) / duration / 0.4;
    g.visible = t >= 0 && t <= 1;
    if (!g.visible) return;
    const calm = settings.reduced,
      open = Math.min(1, t * 3),
      fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    parts.ring.scale.setScalar(calm ? 1 : open);
    parts.ring.position.y = 0.06;
    (parts.ring.material as T.MeshBasicMaterial).opacity = 0.9 * fade;
    parts.rune.rotation.y = calm ? 0 : t * 4;
    parts.rune.position.y = 0.07;
    (parts.rune.material as T.MeshBasicMaterial).opacity = 0.7 * fade;
    const tall = height * 2.6 * (calm ? 1 : open);
    parts.column.scale.set(1, tall, 1);
    parts.column.position.y = tall / 2;
    (parts.column.material as T.MeshBasicMaterial).opacity = 0.22 * fade;
    parts.sparks.visible = !calm;
    for (let i = 0; i < 12; i++) {
      const k = (t * 2.2 + i / 12) % 1,
        a = i * 2.4 + t * 6;
      o.position.set(Math.cos(a) * 0.6 * (1 - k * 0.5), k * height * 2.4, Math.sin(a) * 0.6 * (1 - k * 0.5));
      o.scale.setScalar(Math.sin(k * Math.PI) * fade);
      o.updateMatrix();
      parts.sparks.setMatrixAt(i, o.matrix);
    }
    parts.sparks.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.ring} />
      <primitive object={parts.rune} />
      <primitive object={parts.column} />
      <primitive object={parts.sparks} />
    </group>
  );
}

const DUST = 10;
/** Dust kicked up where a creature lands: a knocked-out one toppling, or a
 * newcomer dropping onto its ring. Starts at `start` (ms) and lasts `length`. */
export function LandingDust({ start, length = 600, size }: { start: number; length?: number; size: number }) {
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: softDot(), color: "#cdbfa6", transparent: true, opacity: 0.7, depthWrite: false }),
      DUST,
    );
    m.frustumCulled = false;
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
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ camera }) => {
    const t = (Date.now() - start) / length;
    mesh.visible = !settings.reduced && t >= 0 && t <= 1;
    if (!mesh.visible) return;
    (mesh.material as T.MeshBasicMaterial).opacity = 0.7 * (1 - t);
    for (let i = 0; i < DUST; i++) {
      const a = (i / DUST) * Math.PI * 2,
        r = size * (0.35 + Math.sqrt(t) * 0.9);
      o.position.set(Math.cos(a) * r, 0.12 + t * 0.25, Math.sin(a) * r);
      o.quaternion.copy(camera.quaternion);
      o.scale.setScalar(size * (0.3 + t * 0.45));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

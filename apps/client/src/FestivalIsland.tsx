import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as T from "three";
import type { Profile } from "../../../packages/shared/types";
import {
  FESTIVAL_PLACES as P,
  FESTIVAL_POND,
  FESTIVAL_RADIUS as R,
  FESTIVAL_TRACK,
  FESTIVAL_TENTS,
  FESTIVAL_POLES,
  FESTIVAL_HURDLES,
  festivalWalkable,
  huntSpots,
} from "../../../packages/shared/festival";
import { islandArrival, islandDock } from "../../../packages/shared/islands";
import { utcDay } from "../../../packages/shared/town";
import { Kit, SHAPES } from "./village-kit";
import { lampGlow } from "./village-materials";
import { villageMaterial } from "./HavenVillage";
import { DayNight, SkyLife } from "./Atmosphere";
import { WeatherEffects } from "./Weather";
import { ModelLighting } from "./ModelLighting";
import { WorldInteraction } from "./WorldInteraction";
import { WalkContext, type Walker } from "./hover";
import { Avatar, Creature, Explorer, type WalkArea } from "./Scene";
import { SkyferryDock } from "./Skyferry";
import { audio, settings } from "./audio";
import type { ExplorationInput } from "./world-guide";

const STRIPES = ["#d9674f", "#f3e3b5", "#5fa7bb", "#f2c75e", "#9bc27a", "#b49be0"];
type Built = { solid: T.BufferGeometry; glow: T.BufferGeometry };

/** Named points for the HUD, minimap and nearby prompts. */
export function festivalInteractables(profile: Profile) {
  const found = profile.festival?.day === utcDay() ? profile.festival.hunt : [];
  return [
    { id: "fest-ferry", name: "Skyferry", hint: "Sail back to Havenreach", p: [islandDock(R)[0], 0, 0] },
    { id: "fest-board", name: "Festival board", hint: "Today's activities and the lantern hunt", p: [P.board[0] - 1.2, 0, P.board[1]] },
    { id: "fest-shop", name: "Ticket booth", hint: "Spend festival tickets", p: [P.shop[0] - 1.2, 0, P.shop[1]] },
    { id: "fest-race", name: "Sprint Stakes", hint: "Race your companion", p: [P.race[0], 0, P.race[1] + 1.5] },
    { id: "fest-course", name: "Hop Hollow course", hint: "Run the obstacle lane", p: [P.course[0] - 1.5, 0, P.course[1] + 1] },
    { id: "fest-fishing", name: "Pond tournament", hint: "Forty-five seconds of fishing", p: [P.fishing[0] - 1.6, 0, P.fishing[1]] },
    ...huntSpots(utcDay())
      .filter((s) => !found.includes(s.id))
      .map((s) => ({ id: `fest-lantern-${s.id}`, name: "Hidden lantern", hint: "Click to collect", p: [s.point[0], 0, s.point[1]] })),
  ];
}
export function festivalArea(profile: Profile): WalkArea {
  return {
    key: "festival",
    allowed: festivalWalkable,
    extent: R + 2,
    home: islandArrival("festival", R),
    points: festivalInteractables(profile),
  };
}

// Static fairground pieces merged into one draw call.
function fairGeometry(): Built {
  const k = new Kit(),
    glow = new Kit();
  // The lantern tree at the heart of the plaza.
  k.add(SHAPES.CYL6, "#7a6650", [0, 1.6, 0], [0.45, 3.2, 0.45]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.add(SHAPES.BUSH, ["#86a96f", "#9cbb7f", "#7fa58a"][i % 3], [Math.cos(a) * 1.4, 3.6 + (i % 2) * 0.5, Math.sin(a) * 1.4], [1.5, 1.2, 1.5]);
  }
  k.add(SHAPES.BUSH, "#9cbb7f", [0, 4.6, 0], [1.8, 1.4, 1.8]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      r = 2.3 + (i % 3) * 0.35;
    k.box("#5d4a3a", [Math.cos(a) * r, 3.05 - (i % 2) * 0.3, Math.sin(a) * r], [0.02, 0.4, 0.02]);
    glow.add(SHAPES.BALL, "#fff", [Math.cos(a) * r, 2.75 - (i % 2) * 0.3, Math.sin(a) * r], [0.16, 0.2, 0.16]);
  }
  // Festival board: a roofed notice board facing the dock.
  k.push([P.board[0], 0, P.board[1]], -Math.PI / 2);
  for (const x of [-1.1, 1.1]) k.add(SHAPES.CYL6, "#6d5847", [x, 1.1, 0], [0.1, 2.2, 0.1]);
  k.box("#a5876a", [0, 1.45, 0], [2.4, 1.3, 0.12]);
  k.box("#f3ead2", [0, 1.45, 0.07], [2.1, 1.05, 0.02]);
  for (let i = 0; i < 4; i++) k.box(STRIPES[i], [-0.65 + i * 0.43, 1.6 - (i % 2) * 0.3, 0.09], [0.32, 0.36, 0.02]);
  k.add(SHAPES.GABLE, "#c5573f", [0, 2.2, 0], [2.8, 0.5, 0.6]);
  k.pop();
  // Ticket booth: a striped kiosk with a counter.
  k.push([P.shop[0], 0, P.shop[1]], -Math.PI / 2);
  k.box("#efe4cc", [0, 0.6, 0], [2.6, 1.2, 1.6]);
  k.box("#a5876a", [0, 1.25, 0.85], [2.8, 0.1, 0.5]);
  for (let i = 0; i < 7; i++) k.box(STRIPES[i % 2 ? 1 : 0], [-1.2 + i * 0.4, 2.65, 0.25], [0.4, 0.12, 2.1], [0.25, 0, 0]);
  for (const x of [-1.25, 1.25]) k.add(SHAPES.CYL6, "#6d5847", [x, 1.9, 0.9], [0.06, 1.4, 0.06]);
  k.box("#f2c75e", [0, 3.05, 0], [1.6, 0.4, 0.08]);
  glow.add(SHAPES.BALL, "#fff", [-0.9, 2.3, 0.95], [0.13, 0.16, 0.13]);
  glow.add(SHAPES.BALL, "#fff", [0.9, 2.3, 0.95], [0.13, 0.16, 0.13]);
  k.pop();
  // Race track starting gate and the obstacle lane hurdles.
  for (const x of [-1.8, 1.8]) k.add(SHAPES.CYL6, "#efe7d6", [x, 1.4, -9.5], [0.12, 2.8, 0.12]);
  k.box("#d9674f", [0, 2.75, -9.5], [3.9, 0.35, 0.1]);
  for (let i = 0; i < 6; i++) k.box(i % 2 ? "#f3e3b5" : "#2f4f57", [-1.5 + i * 0.6, 0.02, -10.1], [0.6, 0.02, 0.6]);
  FESTIVAL_HURDLES.forEach(({ x, z }, i) => {
    for (const s of [-0.7, 0.7]) k.box("#efe7d6", [x, 0.35, z + s], [0.08, 0.7, 0.08]);
    k.box(i % 2 ? "#d9674f" : "#5fa7bb", [x, 0.62, z], [0.1, 0.1, 1.5]);
  });
  // Tournament booth beside the pond.
  k.push([P.fishing[0], 0, P.fishing[1] + 1.7]);
  k.box("#efe4cc", [0, 0.55, 0], [1.6, 1.1, 1.2]);
  for (let i = 0; i < 4; i++) k.box(STRIPES[i % 2 ? 1 : 2], [-0.6 + i * 0.4, 1.7, 0], [0.4, 0.1, 1.5], [0.3, 0, 0]);
  k.pop();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.add(SHAPES.ROCK, i % 2 ? "#a7a392" : "#918d7e", [FESTIVAL_POND.x + Math.cos(a) * (FESTIVAL_POND.rx + 0.2), 0.1, FESTIVAL_POND.z + Math.sin(a) * (FESTIVAL_POND.rz + 0.2)], [0.35, 0.22, 0.3]);
  }
  // High striker: a tall post with a bell and a pad.
  k.box("#a5876a", [P.striker[0], 0.1, P.striker[1]], [1.2, 0.2, 1.2]);
  k.box("#efe7d6", [P.striker[0], 2.4, P.striker[1] + 1.2], [0.3, 4.8, 0.2]);
  for (let i = 0; i < 6; i++) k.box(STRIPES[i % 4], [P.striker[0], 0.6 + i * 0.7, P.striker[1] + 1.32], [0.2, 0.08, 0.02]);
  k.add(SHAPES.BALL, "#e3bd56", [P.striker[0], 5, P.striker[1] + 1.2], [0.32, 0.28, 0.32]);
  // Confetti cannon.
  k.push([P.confetti[0], 0, P.confetti[1]]);
  for (const s of [-1, 1]) k.add(SHAPES.CYL, "#6d5847", [s * 0.45, 0.35, 0], [0.35, 0.1, 0.35], [0, 0, Math.PI / 2]);
  k.add(SHAPES.CYL, "#5fa7bb", [0, 0.75, 0.15], [0.32, 1.5, 0.32], [-0.9, 0, 0]);
  k.add(SHAPES.CYL, "#f2c75e", [0, 1.3, 0.75], [0.36, 0.15, 0.36], [-0.9, 0, 0]);
  k.pop();
  // Striped tents and bunting poles around the rim.
  for (const { x, z, a, i } of FESTIVAL_TENTS) {
    k.push([x, 0, z], -a + Math.PI / 2);
    for (let j = 0; j < 8; j++) k.add(SHAPES.CONE4, STRIPES[j % 2 ? 1 : i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 4], [0, 1.35, 0], [1.5, 2.7, 1.5], [0, (j / 8) * Math.PI * 2, 0]);
    k.add(SHAPES.CYL6, "#6d5847", [0, 3, 0], [0.04, 0.8, 0.04]);
    k.box(STRIPES[i % STRIPES.length], [0.18, 3.25, 0], [0.32, 0.18, 0.02]);
    k.pop();
  }
  const poles = FESTIVAL_POLES;
  for (const [x, z] of poles) {
    k.add(SHAPES.CYL6, "#6d5847", [x, 1.7, z], [0.07, 3.4, 0.07]);
    glow.add(SHAPES.BALL, "#fff", [x, 3.5, z], [0.15, 0.18, 0.15]);
  }
  for (let i = 0; i < poles.length - 1; i++) {
    const [ax, az] = poles[i],
      [bx, bz] = poles[i + 1],
      len = Math.hypot(bx - ax, bz - az);
    if (len > 12) continue;
    const ang = Math.atan2(bz - az, bx - ax);
    for (let j = 1; j < len / 0.7; j++) {
      const t = (j * 0.7) / len,
        sag = Math.sin(t * Math.PI) * 0.6;
      k.add(SHAPES.CONE4, STRIPES[j % STRIPES.length], [ax + (bx - ax) * t, 3.1 - sag, az + (bz - az) * t], [0.16, -0.32, 0.04], [0, -ang, 0]);
    }
  }
  return { solid: k.build(), glow: glow.build() };
}

function FairGround() {
  const built = useMemo(fairGeometry, []);
  useEffect(() => () => [built.solid, built.glow].forEach((g) => g.dispose()), [built]);
  return (
    <group name="festival-ground">
      <mesh name="festival-turf" receiveShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[R, R * 0.96, 1, 96]} />
        <meshStandardMaterial color="#a9c98f" roughness={1} />
      </mesh>
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[R * 0.96, R * 0.86, 0.6, 30]} />
        <meshStandardMaterial color="#9b8467" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -1.55 - R * 0.3, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[R * 0.86, R * 0.6, 14]} />
        <meshStandardMaterial color="#7d7a6c" flatShading roughness={1} />
      </mesh>
      {/* Plaza paving, the path from the dock and the race track. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#e3d5b0" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-(R + 6) / 2, 0.011, 0]}>
        <planeGeometry args={[R - 6, 2.2]} />
        <meshStandardMaterial color="#e3d5b0" roughness={1} />
      </mesh>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[FESTIVAL_TRACK.x, 0.013, FESTIVAL_TRACK.z]}
        scale={[FESTIVAL_TRACK.rx, FESTIVAL_TRACK.rz, 1]}
      >
        <ringGeometry args={[0.78, 1, 64]} />
        <meshStandardMaterial color="#c99a72" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FESTIVAL_POND.x, 0.03, FESTIVAL_POND.z]} scale={[FESTIVAL_POND.rx, FESTIVAL_POND.rz, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#6fb0bf" roughness={0.3} />
      </mesh>
      <mesh name="festival-structures" geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh geometry={built.glow} material={lampGlow} />
    </group>
  );
}
function FerrisWheel() {
  const wheel = useRef<T.Group>(null);
  const cars = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  useFrame(({ clock }) => {
    if (!wheel.current || settings.reduced) return;
    const a = clock.elapsedTime * 0.12;
    wheel.current.rotation.z = a;
    // Gondolas stay level as the wheel turns.
    wheel.current.children.forEach((c) => {
      if (c.name === "gondola") c.rotation.z = -a;
    });
  });
  return (
    <group name="ferris-wheel" position={[P.wheel[0], 0, P.wheel[1]]} rotation={[0, -0.7, 0]}>
      {[-0.9, 0.9].map((z) => (
        <group key={z}>
          <mesh position={[-1.6, 3.2, z]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.18, 7, 0.18]} />
            <meshStandardMaterial color="#efe7d6" flatShading />
          </mesh>
          <mesh position={[1.6, 3.2, z]} rotation={[0, 0, 0.45]}>
            <boxGeometry args={[0.18, 7, 0.18]} />
            <meshStandardMaterial color="#efe7d6" flatShading />
          </mesh>
        </group>
      ))}
      <group ref={wheel} position={[0, 6.2, 0]}>
        <mesh>
          <torusGeometry args={[4.6, 0.09, 6, 40]} />
          <meshStandardMaterial color="#d9674f" />
        </mesh>
        {cars.map((a, i) => (
          <mesh key={`s${i}`} rotation={[0, 0, a]} position={[Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0]}>
            <boxGeometry args={[4.6, 0.07, 0.07]} />
            <meshStandardMaterial color="#efe7d6" />
          </mesh>
        ))}
        {cars.map((a, i) => (
          <group key={i} name="gondola" position={[Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0]}>
            <mesh position={[0, -0.55, 0]}>
              <boxGeometry args={[0.8, 0.6, 0.9]} />
              <meshStandardMaterial color={STRIPES[i % STRIPES.length]} flatShading />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <coneGeometry args={[0.6, 0.35, 4]} />
              <meshStandardMaterial color="#f3e3b5" flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
/** The carousel turns gently; a click sends it spinning with a chime. */
function Carousel({ disabled }: { disabled: boolean }) {
  const top = useRef<T.Group>(null),
    spin = useRef(0);
  const riders = ["emberfox", "bubbloom", "mossprig", "zippinch"];
  // The canopy fades when the camera swings close, so it never hides the keeper.
  const canopy = useMemo(
    () => [
      new T.MeshStandardMaterial({ color: "#d9674f", flatShading: true, transparent: true }),
      new T.MeshStandardMaterial({ color: "#f3e3b5", side: T.DoubleSide, transparent: true }),
    ],
    [],
  );
  useEffect(() => () => canopy.forEach((m) => m.dispose()), [canopy]);
  useFrame(({ clock, camera }, dt) => {
    const near = Math.hypot(camera.position.x - P.carousel[0], camera.position.z - P.carousel[1]);
    const opacity = Math.min(1, Math.max(0.15, (near - 6) / 6));
    for (const m of canopy) {
      m.opacity += (opacity - m.opacity) * Math.min(1, dt * 6);
      m.depthWrite = m.opacity > 0.95;
    }
    if (!top.current || settings.reduced) return;
    spin.current = Math.max(0, spin.current - dt * 0.35);
    top.current.rotation.y += dt * (0.35 + spin.current * 2.4);
    top.current.children.forEach((c, i) => {
      if (c.name === "rider") c.position.y = 0.55 + Math.sin(clock.elapsedTime * 2.2 + i) * 0.18;
    });
  });
  return (
    <WorldInteraction
      name="fest-carousel"
      position={[P.carousel[0], 0, P.carousel[1]]}
      title="Carousel"
      hint="Click to give it a spin"
      disabled={disabled}
      activate={() => {
        spin.current = 1.6;
        audio.cue("victory");
      }}
    >
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3.1, 0.3, 24]} />
        <meshStandardMaterial color="#efe4cc" flatShading />
      </mesh>
      <group ref={top}>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 3.2, 10]} />
          <meshStandardMaterial color="#e3bd56" metalness={0.3} />
        </mesh>
        <mesh position={[0, 3.6, 0]} material={canopy[0]}>
          <coneGeometry args={[3.3, 1.2, 12]} />
        </mesh>
        <mesh position={[0, 3.05, 0]} material={canopy[1]}>
          <cylinderGeometry args={[3.3, 3.3, 0.3, 12, 1, true]} />
        </mesh>
        {riders.map((id, i) => {
          const a = (i / riders.length) * Math.PI * 2;
          return (
            <group key={id} name="rider" position={[Math.cos(a) * 2.1, 0.55, Math.sin(a) * 2.1]} rotation={[0, -a, 0]}>
              <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
                <meshStandardMaterial color="#e3bd56" metalness={0.4} />
              </mesh>
              <Creature id={id} state="idle" scale={0.45} />
            </group>
          );
        })}
      </group>
    </WorldInteraction>
  );
}
/** Swing the hammer: the puck climbs and, on a strong hit, rings the bell. */
function HighStriker({ disabled }: { disabled: boolean }) {
  const puck = useRef<T.Mesh>(null),
    shot = useRef({ peak: 0, t: 10 });
  const [, bump] = useState(0);
  useFrame((_s, dt) => {
    const s = shot.current;
    s.t += dt;
    if (!puck.current) return;
    // Up for half a second, then back down.
    const h = s.t < 0.5 ? s.peak * Math.sin((s.t / 0.5) * (Math.PI / 2)) : s.peak * Math.max(0, 1 - (s.t - 0.5) / 0.8);
    puck.current.position.y = 0.4 + h * 4.3;
  });
  return (
    <WorldInteraction
      name="fest-striker"
      position={[P.striker[0], 0, P.striker[1]]}
      title="High striker"
      hint="Click to swing the hammer"
      disabled={disabled}
      activate={() => {
        const peak = 0.35 + Math.random() * 0.65;
        shot.current = { peak, t: 0 };
        audio.cue(peak > 0.93 ? "victory" : "collect");
        bump((n) => n + 1);
      }}
    >
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh ref={puck} position={[0, 0.4, 1.38]}>
        <boxGeometry args={[0.28, 0.18, 0.12]} />
        <meshStandardMaterial color="#d9674f" />
      </mesh>
    </WorldInteraction>
  );
}
/** A click fires a burst of paper confetti that drifts back down. */
function ConfettiCannon({ disabled }: { disabled: boolean }) {
  const count = 160;
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.PlaneGeometry(0.12, 0.08),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
      count,
    );
    const c = new T.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, c.set(STRIPES[i % STRIPES.length]));
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as T.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  const bits = useRef<{ p: T.Vector3; v: T.Vector3; r: number }[]>([]),
    o = useMemo(() => new T.Object3D(), []);
  useFrame((_s, dt) => {
    const list = bits.current;
    if (!list.length) return;
    dt = Math.min(dt, 0.05);
    for (const b of list) {
      b.v.y -= dt * 6;
      b.v.multiplyScalar(1 - dt * 1.6);
      b.p.addScaledVector(b.v, dt);
      b.r += dt * 6;
    }
    bits.current = list.filter((b) => b.p.y > 0.02);
    bits.current.forEach((b, i) => {
      o.position.copy(b.p);
      o.rotation.set(b.r, b.r * 0.7, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.count = bits.current.length;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <WorldInteraction
        name="fest-confetti"
        position={[P.confetti[0], 0, P.confetti[1]]}
        title="Confetti cannon"
        hint="Click to celebrate"
        disabled={disabled}
        activate={() => {
          audio.cue("victory");
          bits.current = Array.from({ length: count }, () => ({
            p: new T.Vector3(P.confetti[0], 1.4, P.confetti[1] + 0.8),
            v: new T.Vector3((Math.random() - 0.5) * 5, 6 + Math.random() * 5, 3 + Math.random() * 4),
            r: Math.random() * 6,
          }));
        }}
      >
        <mesh position={[0, 0.8, 0.3]}>
          <boxGeometry args={[1.2, 1.6, 1.6]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </WorldInteraction>
      <primitive object={mesh} />
    </>
  );
}
function Balloons() {
  const group = useRef<T.Group>(null);
  const list = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.1;
        return { x: Math.cos(a) * (8 + (i % 3) * 4), z: Math.sin(a) * (8 + (i % 3) * 4), c: STRIPES[i % STRIPES.length], h: 6 + (i % 4) * 1.4 };
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (settings.reduced) return;
    group.current?.children.forEach((b, i) => {
      b.position.y = list[i].h + Math.sin(clock.elapsedTime * 0.6 + i) * 0.4;
    });
  });
  return (
    <group ref={group} name="festival-balloons">
      {list.map((b, i) => (
        <group key={i} position={[b.x, b.h, b.z]}>
          <mesh>
            <sphereGeometry args={[0.45, 12, 10]} />
            <meshStandardMaterial color={b.c} roughness={0.35} />
          </mesh>
          <mesh position={[0, -1.1, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.6, 4]} />
            <meshBasicMaterial color="#efe7d6" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
/** Today's hidden lanterns: small glowing boxes tucked around the fair. */
function HuntLanterns({ profile, onInteract, disabled }: { profile: Profile; onInteract: (id: string) => void; disabled: boolean }) {
  const found = profile.festival?.day === utcDay() ? profile.festival.hunt : [];
  const spots = huntSpots(utcDay());
  const glow = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    glow.current?.children.forEach((g, i) => {
      if (!settings.reduced) g.position.y = 0.32 + Math.sin(clock.elapsedTime * 2 + i) * 0.05;
    });
  });
  return (
    <group ref={glow} name="festival-hunt">
      {spots.map((s) =>
        found.includes(s.id) ? (
          <mesh key={s.id} position={[s.point[0], 0.2, s.point[1]]}>
            <boxGeometry args={[0.32, 0.36, 0.32]} />
            <meshStandardMaterial color="#8c7a64" />
          </mesh>
        ) : (
          <group key={s.id} position={[s.point[0], 0.32, s.point[1]]}>
            <WorldInteraction
              name={`fest-lantern-${s.id}`}
              title="Hidden lantern"
              hint="Click to collect"
              disabled={disabled}
              reach={2.6}
              activate={() => onInteract(`fest-lantern-${s.id}`)}
            >
              <mesh material={lampGlow}>
                <boxGeometry args={[0.3, 0.38, 0.3]} />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <coneGeometry args={[0.24, 0.16, 4]} />
                <meshStandardMaterial color="#c5573f" />
              </mesh>
            </WorldInteraction>
          </group>
        ),
      )}
    </group>
  );
}
function Label({ position, icon, text, id, onClick }: { position: [number, number, number]; icon: string; text: string; id: string; onClick: () => void }) {
  return (
    <Html position={position} center zIndexRange={[2, 0]} style={{ pointerEvents: "auto" }}>
      <button className="world-label" data-marker={id} onClick={onClick}>
        <span>{icon}</span>
        {text}
      </button>
    </Html>
  );
}
export function FestivalScene({
  profile,
  blocked,
  onNear,
  onInteract,
  onPosition,
  pet,
  input,
}: {
  profile: Profile;
  blocked: boolean;
  onNear: (s: string) => void;
  onInteract: (s: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
  input: MutableRefObject<ExplorationInput>;
}) {
  const area = useMemo(() => festivalArea(profile), [profile]);
  const spawn = useMemo(() => islandArrival("festival", R), []);
  const walker = useRef<Walker>({ go: (_t, _r, act) => act?.() });
  const go = (id: string, at: number[]) => () => walker.current.go([at[0], at[2]], 5.5, () => onInteract(id));
  const points = Object.fromEntries(area.points.map((p) => [p.id, p.p]));
  return (
    <Canvas
      shadows
      camera={{ position: [spawn[0] + 10, 10, spawn[1] + 11], fov: 45 }}
      frameloop={blocked ? "demand" : "always"}
      dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
    >
      <WalkContext.Provider value={walker}>
        <color attach="background" args={["#a7c7cf"]} />
        <fog attach="fog" args={["#bcd3d0", 34, 110]} />
        <ModelLighting intensity={0.35} />
        <DayNight sky="#a7c7cf" fog="#bcd3d0" haven={false} />
        <SkyLife radius={R + 16} />
        <WeatherEffects region="haven" />
        <FairGround />
        <FerrisWheel />
        <Balloons />
        <Carousel disabled={blocked} />
        <HighStriker disabled={blocked} />
        <ConfettiCannon disabled={blocked} />
        <HuntLanterns profile={profile} onInteract={onInteract} disabled={blocked} />
        <WorldInteraction
          name="interactable-fest-board"
          position={[P.board[0], 0, P.board[1]]}
          title="Festival board"
          hint="Today's activities and the lantern hunt"
          disabled={blocked}
          approach={[points["fest-board"][0], points["fest-board"][2]]}
          activate={() => onInteract("fest-board")}
        >
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[0.4, 2.6, 2.6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </WorldInteraction>
        <WorldInteraction
          name="interactable-fest-shop"
          position={[P.shop[0], 0, P.shop[1]]}
          title="Ticket booth"
          hint="Spend festival tickets"
          disabled={blocked}
          approach={[points["fest-shop"][0], points["fest-shop"][2]]}
          activate={() => onInteract("fest-shop")}
        >
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[1.8, 2.8, 2.8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          <group position={[-0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Avatar index={6} position={[0, 0, 0]} />
          </group>
        </WorldInteraction>
        <WorldInteraction
          name="interactable-fest-ferry"
          position={[islandDock(R)[0], 0, 0]}
          title="Skyferry"
          hint="Sail back to Havenreach"
          disabled={blocked}
          activate={() => onInteract("fest-ferry")}
        >
          <SkyferryDock position={[0, 0, 0]} heading={-Math.PI / 2} />
        </WorldInteraction>
        <WorldInteraction
          name="interactable-fest-race"
          position={[P.race[0], 0, P.race[1] - 0.5]}
          title="Sprint Stakes"
          hint="Race your companion for tickets"
          disabled={blocked}
          approach={[points["fest-race"][0], points["fest-race"][2]]}
          activate={() => onInteract("fest-race")}
        >
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[3.8, 2.8, 0.6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </WorldInteraction>
        <WorldInteraction
          name="interactable-fest-course"
          position={[15, 0, -6.5]}
          title="Hop Hollow course"
          hint="Jump and slide for tickets"
          disabled={blocked}
          approach={[points["fest-course"][0], points["fest-course"][2]]}
          activate={() => onInteract("fest-course")}
        >
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[9, 1, 3]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </WorldInteraction>
        <WorldInteraction
          name="interactable-fest-fishing"
          position={[P.fishing[0], 0, P.fishing[1] + 1.7]}
          title="Lantern pond tournament"
          hint="Fish for points and tickets"
          disabled={blocked}
          approach={[points["fest-fishing"][0], points["fest-fishing"][2]]}
          activate={() => onInteract("fest-fishing")}
        >
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1.8, 2, 1.6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </WorldInteraction>
        {!blocked && (
          <>
            <Label position={[P.fishing[0], 2.6, P.fishing[1] + 1.7]} icon="≈" text="Pond tournament" id="fest-fishing" onClick={go("fest-fishing", points["fest-fishing"])} />
            <Label position={[P.race[0], 3.4, P.race[1] - 0.5]} icon="➶" text="Sprint Stakes" id="fest-race" onClick={go("fest-race", points["fest-race"])} />
            <Label position={[14, 2, -6.5]} icon="⤴" text="Hop Hollow course" id="fest-course" onClick={go("fest-course", points["fest-course"])} />
            <Label position={[islandDock(R)[0], 3.4, 0]} icon="⛵" text="Skyferry" id="fest-ferry" onClick={go("fest-ferry", points["fest-ferry"])} />
            <Label position={[P.board[0], 3.2, P.board[1]]} icon="❖" text="Festival board" id="fest-board" onClick={go("fest-board", points["fest-board"])} />
            <Label position={[P.shop[0], 3.6, P.shop[1]]} icon="✦" text="Ticket booth" id="fest-shop" onClick={go("fest-shop", points["fest-shop"])} />
          </>
        )}
        <Explorer
          key="festival"
          spawn={spawn}
          area={area}
          {...{ profile, blocked, onNear, onInteract, onPosition, pet, input }}
          walker={walker}
        />
      </WalkContext.Provider>
    </Canvas>
  );
}

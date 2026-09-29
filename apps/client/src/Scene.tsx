import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as T from "three";
import { byId, REGIONS } from "../../../packages/shared/content";
import type { Battle, Profile } from "../../../packages/shared/types";
import {
  animateAvatar,
  animateCreature,
  createAvatar,
  createCreature,
  type Motion,
} from "./models";
import { audio, settings } from "./audio";
import { UltimateEffect } from "./UltimateEffects";
import { RegionScenery, blocksLandmark } from "./RegionScenery";
function RenderStats() {
  const label = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0),
    frames = useRef(0);
  useFrame((_state, dt) => {
    elapsed.current += dt;
    frames.current++;
    if (elapsed.current > 1) {
      if (label.current)
        label.current.textContent = `DEV · ${Math.round(frames.current / elapsed.current)} FPS`;
      elapsed.current = 0;
      frames.current = 0;
    }
  });
  return import.meta.env.DEV ? (
    <Html fullscreen style={{ pointerEvents: "none" }} zIndexRange={[1, 0]}>
      <span ref={label} className="fps-readout" />
    </Html>
  ) : null;
}
export function Creature({
  id,
  state = "idle",
  phase = 0,
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  paused = false,
}: {
  id: string;
  state?: Motion;
  phase?: number;
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  paused?: boolean;
}) {
  const model = useMemo(() => createCreature(id), [id]);
  useFrame(({ clock }) => {
    if (!paused)
      animateCreature(
        model,
        clock.elapsedTime,
        state,
        phase || (clock.elapsedTime % 2) / 2,
        settings.reduced,
      );
  });
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
export function Avatar({
  index = 0,
  walk = false,
  gesture = false,
  position = [0, 0, 0],
}: {
  index?: number;
  walk?: boolean;
  gesture?: boolean;
  position?: [number, number, number];
}) {
  const model = useMemo(() => createAvatar(index), [index]);
  useFrame(({ clock }) =>
    animateAvatar(model, clock.elapsedTime, walk, gesture, settings.reduced),
  );
  return (
    <group position={position}>
      <primitive object={model} />
    </group>
  );
}
function Tree({
  position,
  scale = 1,
  color = "#709779",
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
}) {
  const tree = useRef<T.Group>(null);
  const point = useMemo(() => new T.Vector3(), []);
  const direction = useMemo(() => new T.Vector3(), []);
  const ray = useMemo(() => new T.Ray(), []);
  const lastFade = useRef(false);
  useFrame(({ camera }) => {
    if (!tree.current) return;
    tree.current.getWorldPosition(point);
    point.y += 2.5 * scale;
    camera.getWorldDirection(direction);
    ray.set(camera.position, direction);
    const faded =
      camera.position.distanceTo(point) < 8 &&
      ray.distanceToPoint(point) < 2 * scale;
    if (faded !== lastFade.current) {
      tree.current.traverse((obj) => {
        if (obj instanceof T.Mesh) {
          const mat = obj.material as T.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = faded ? 0.16 : 1;
          mat.depthWrite = !faded;
        }
      });
      lastFade.current = faded;
    }
  });
  return (
    <group ref={tree} position={position} scale={scale}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.25, 2.6, 6]} />
        <meshStandardMaterial color="#6c6253" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 2) * 0.65,
            2.2 + i * 0.6,
            Math.cos(i * 2) * 0.4,
          ]}
          castShadow
        >
          <icosahedronGeometry args={[1.35 - i * 0.18, 1]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}
function Crystal({
  position,
  color = "#8bdbd3",
  scale = 1,
}: {
  position: [number, number, number];
  color?: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {[-1, 0, 1].map((v, i) => (
        <mesh
          key={v}
          position={[v * 0.3, 0.7 - i * 0.13, 0]}
          rotation={[0, 0, -v * 0.3]}
          castShadow
        >
          <coneGeometry args={[0.27, 1.6 - i * 0.25, 5]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
function Island({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[Math.PI, 0, 0.06]}>
        <coneGeometry args={[5, 7, 7]} />
        <meshStandardMaterial color="#567578" flatShading />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[5, 5, 0.35, 8]} />
        <meshStandardMaterial color="#87a99b" />
      </mesh>
      <Tree position={[0, 3.7, 0]} scale={1.5} />
      <mesh position={[2, 0, 2]}>
        <boxGeometry args={[0.35, 7, 0.1]} />
        <meshBasicMaterial color="#a5e4e0" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
function Environment({
  region = "haven",
  title = false,
}: {
  region?: string;
  title?: boolean;
}) {
  const r = REGIONS.find((r) => r.id === region) || REGIONS[0];
  const canyon = region === "canyon",
    snow = region === "hollow";
  const trees = useMemo(
    () =>
      Array.from({ length: settings.quality === "Low" ? 24 : 45 }, (_, i) => {
        const a = i * 2.39996;
        const rad = 9 + (i % 7) * 1.05;
        return {
          pos: [Math.sin(a) * rad, 0, Math.cos(a) * rad] as [
            number,
            number,
            number,
          ],
          s: 0.8 + (i % 4) * 0.25,
        };
      }),
    [],
  );
  return (
    <>
      <color
        attach="background"
        args={[
          title ? "#94b5b6" : snow ? "#9fbacb" : canyon ? "#bb9b8d" : "#9bbeb5",
        ]}
      />
      <fog attach="fog" args={[title ? "#94b5b6" : r.color, 28, 95]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#f4ead1", "#3e6f69", 1.6]} />
      <directionalLight
        position={[-9, 18, 8]}
        color="#fff0ce"
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.001}
      />
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <cylinderGeometry args={[18, 18.5, 0.6, 64]} />
        <meshStandardMaterial color={r.ground} roughness={1} />
      </mesh>
      <mesh position={[0, -3.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[18.4, 7, 11]} />
        <meshStandardMaterial color="#526964" flatShading />
      </mesh>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 1]}
      >
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial
          color={snow ? "#dce2db" : canyon ? "#bc8c6c" : "#c2c29a"}
          roughness={1}
        />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          receiveShadow
          position={[i * 2, 0.025, 3 - i]}
          rotation={[-Math.PI / 2, 0, 0.2 + i]}
        >
          <circleGeometry args={[2.1, 7]} />
          <meshStandardMaterial color={snow ? "#d3dfe1" : "#b6b991"} />
        </mesh>
      ))}
      {trees
        .filter((t) => t.pos[2] < 2 || t.pos[0] < -13)
        .map(({ pos, s }, i) =>
          canyon ? (
            <Crystal
              key={i}
              position={pos}
              scale={s}
              color={i % 2 ? "#ebad77" : "#bf87bb"}
            />
          ) : (
            <Tree
              key={i}
              position={pos}
              scale={s}
              color={
                snow
                  ? i % 2
                    ? "#a6ced0"
                    : "#e1e7df"
                  : i % 3
                    ? "#729982"
                    : "#a7bb91"
              }
            />
          ),
        )}
      {Array.from({ length: 35 }, (_, i) => (
        <group
          key={i}
          position={[Math.sin(i * 8) * 16, 0.06, Math.cos(i * 3) * 15]}
        >
          <mesh rotation={[0, i, 0.2]}>
            <dodecahedronGeometry args={[0.13 + (i % 3) * 0.1, 0]} />
            <meshStandardMaterial
              color={
                i % 4 === 0 ? "#ecbfa6" : i % 4 === 1 ? "#d3d8a4" : r.ground
              }
            />
          </mesh>
        </group>
      ))}
      <Island position={[-23, 8, -35]} scale={1.4} />
      <Island position={[24, 6, -30]} scale={0.9} />
      <Island position={[4, 14, -62]} scale={1.8} />
      <Island position={[-38, 2, -10]} scale={0.6} />
      <mesh position={[-23, 26, -60]}>
        <sphereGeometry args={[5, 32, 24]} />
        <meshBasicMaterial color="#f6e6bb" />
      </mesh>
      <group position={[1, 0, -6]}>
        <mesh position={[-2, 2, 0]} castShadow>
          <boxGeometry args={[0.75, 4, 0.85]} />
          <meshStandardMaterial color="#d5d4b9" />
        </mesh>
        <mesh position={[2, 2, 0]} castShadow>
          <boxGeometry args={[0.75, 4, 0.85]} />
          <meshStandardMaterial color="#d5d4b9" />
        </mesh>
        <mesh position={[0, 4.1, 0]} rotation={[0, 0, 0.035]} castShadow>
          <boxGeometry args={[5, 0.6, 1]} />
          <meshStandardMaterial color="#dfddc1" />
        </mesh>
        <mesh position={[0, 2.4, 0.1]}>
          <torusGeometry args={[1.4, 0.05, 6, 50]} />
          <meshStandardMaterial
            color="#a1f1de"
            emissive="#55bda8"
            emissiveIntensity={2}
          />
        </mesh>
        <Crystal position={[0, 1.4, 0.1]} scale={0.65} />
      </group>
      <group position={[-6, 0, -3]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1, 0.9, 8]} />
          <meshStandardMaterial color="#d3cfac" />
        </mesh>
        <Crystal position={[0, 1.2, 0]} scale={0.65} />
      </group>
      <group position={[7, 0, -3]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[2.7, 2.2, 2.4]} />
          <meshStandardMaterial color="#d9ceb0" />
        </mesh>
        <mesh position={[0, 2.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[2.5, 1.8, 4]} />
          <meshStandardMaterial color="#567a79" />
        </mesh>
        <mesh position={[0, 1.1, 1.23]}>
          <planeGeometry args={[0.7, 1.1]} />
          <meshStandardMaterial
            color="#f6c785"
            emissive="#eaba67"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
      <Stars
        radius={40}
        depth={20}
        count={settings.quality === "Low" ? 50 : 160}
        factor={1.2}
        saturation={0}
        fade
        speed={0.2}
      />
      <RegionScenery region={region} />
    </>
  );
}
export const INTERACTABLES = [
  {
    id: "guide",
    name: "Warden Liora",
    hint: "Meet your companions",
    p: [-3, 0, 1],
  },
  {
    id: "recruit",
    name: "Bond shrine",
    hint: "Recruit a Wildbound",
    p: [-6, 0, -3],
  },
  {
    id: "arena",
    name: "Rift arena",
    hint: "Challenge a keeper",
    p: [1, 0, -5],
  },
  {
    id: "collection",
    name: "Field journal",
    hint: "Discover your collection",
    p: [7, 0, -2],
  },
  {
    id: "training",
    name: "Training circle",
    hint: "Help your team grow",
    p: [6, 0, 4],
  },
  {
    id: "encounter",
    name: "Wild encounter",
    hint: "Begin a battle",
    p: [-6, 0, 6],
  },
  {
    id: "boss",
    name: "Region guardian",
    hint: "A greater challenge",
    p: [-10, 0, -7],
  },
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `resource-${i}`,
    name: "Sunseed",
    hint: "Gather resource",
    p: i === 2 ? [7, 0, 7] : [(i - 1) * 6, 0, 8 - i * 2],
  })),
];
function Explorer({
  profile,
  blocked,
  onNear,
  onInteract,
  onPosition,
  pet,
}: {
  profile: Profile;
  blocked: boolean;
  onNear: (id: string) => void;
  onInteract: (id: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
}) {
  const avatar = useMemo(() => createAvatar(profile.avatar), [profile.avatar]);
  const companion = useMemo(
    () =>
      createCreature(
        profile.owned.find((o) => o.id === profile.team[0])?.species ||
          "emberfox",
      ),
    [profile.team[0]],
  );
  const player = useRef(new T.Vector3(0, 0, 5));
  const keys = useRef(new Set<string>());
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const initialTarget = useMemo(() => new T.Vector3(0, 1, 5), []);
  const near = useRef("");
  const last = useRef(0);
  const foot = useRef(0);
  const follow = useRef(new T.Vector3(-1, 0, 6.5));
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches("input,textarea,select")
      )
        return;
      keys.current.add(e.code);
      if (e.code === "KeyE" && !blocked && near.current)
        onInteract(near.current);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [blocked, onInteract]);
  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 0.05);
    const k = keys.current;
    let x = blocked
      ? 0
      : Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft"));
    let z = blocked
      ? 0
      : Number(k.has("KeyS") || k.has("ArrowDown")) -
        Number(k.has("KeyW") || k.has("ArrowUp"));
    const moving = !!(x || z);
    if (moving) {
      const yaw = Math.atan2(
        camera.position.x - player.current.x,
        camera.position.z - player.current.z,
      );
      const v = new T.Vector3(x, 0, z)
        .normalize()
        .applyAxisAngle(new T.Vector3(0, 1, 0), yaw)
        .multiplyScalar(dt * 4);
      const next = player.current.clone().add(v);
      if (
        next.length() < 16.5 &&
        !blocksLandmark(profile.region, next.x, next.z) &&
        !((next.x - 7) ** 2 + (next.z + 3) ** 2 < 3.2) &&
        !((next.x + 6) ** 2 + (next.z + 3) ** 2 < 0.8)
      ) {
        player.current.copy(next);
        camera.position.add(v);
      }
      avatar.rotation.y = Math.atan2(v.x, v.z);
      if (clock.elapsedTime - foot.current > 0.32) {
        audio.cue(
          profile.region === "hollow"
            ? "snowStep"
            : profile.region === "canyon"
              ? "stoneStep"
              : "grass",
        );
        foot.current = clock.elapsedTime;
      }
    }
    avatar.position.x = player.current.x;
    avatar.position.z = player.current.z;
    animateAvatar(avatar, clock.elapsedTime, moving, pet, settings.reduced);
    const delta = player.current.clone().sub(follow.current);
    const following = delta.length() > 1.6;
    if (following)
      follow.current.add(delta.normalize().multiplyScalar(dt * 3.8));
    companion.position.copy(follow.current);
    companion.rotation.y = Math.atan2(
      player.current.x - follow.current.x,
      player.current.z - follow.current.z,
    );
    animateCreature(
      companion,
      clock.elapsedTime,
      pet ? "victory" : following ? "walk" : "idle",
      0,
      settings.reduced,
    );
    if (controls.current)
      controls.current.target.lerp(
        new T.Vector3(player.current.x, 1, player.current.z),
        1 - Math.exp(-dt * 8),
      );
    if (clock.elapsedTime - last.current > 0.2) {
      let nearest = "";
      let dist = 3.3;
      for (const obj of INTERACTABLES) {
        const d = Math.hypot(
          player.current.x - obj.p[0],
          player.current.z - obj.p[2],
        );
        if (d < dist) {
          nearest = obj.id;
          dist = d;
        }
      }
      if (near.current !== nearest) {
        near.current = nearest;
        onNear(nearest);
      }
      onPosition(player.current.x, player.current.z);
      last.current = clock.elapsedTime;
    }
  });
  return (
    <>
      <primitive object={avatar} />
      <primitive object={companion} />
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={0.5}
        maxPolarAngle={1.3}
        target={initialTarget}
      />
    </>
  );
}
function Roamer({
  id,
  position,
}: {
  id: string;
  position: [number, number, number];
}) {
  const ref = useRef<T.Group>(null);
  const lastCall = useRef(0);
  useFrame(({ clock, camera }) => {
    if (ref.current) {
      ref.current.position.x =
        position[0] + Math.sin(clock.elapsedTime * 0.25) * 0.8;
      ref.current.rotation.y = Math.cos(clock.elapsedTime * 0.25) * 0.6;
      const distance = camera.position.distanceTo(ref.current.position);
      if (
        clock.elapsedTime - lastCall.current > 14 + byId[id].variant &&
        distance < 22
      ) {
        audio.voice(
          id,
          "call",
          (ref.current.position.x - camera.position.x) / 15,
          Math.min(0.65, 5 / distance),
        );
        lastCall.current = clock.elapsedTime;
      }
    }
  });
  return (
    <group ref={ref} position={position}>
      <Creature id={id} state="walk" />
    </group>
  );
}
export function WorldScene({
  profile,
  blocked,
  onNear,
  onInteract,
  onPosition,
  pet,
}: {
  profile: Profile;
  blocked: boolean;
  onNear: (s: string) => void;
  onInteract: (s: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 10, 16], fov: 45 }}
      dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
    >
      <Environment region={profile.region} />
      <Explorer
        key={profile.region}
        {...{ profile, blocked, onNear, onInteract, onPosition, pet }}
      />
      <Avatar index={2} position={[-3, 0, 1]} />
      <Roamer
        id={
          profile.region === "canyon"
            ? "magmole"
            : profile.region === "hollow"
              ? "snowmew"
              : "mossprig"
        }
        position={[-6, 0, 6]}
      />
      <Roamer
        id={
          profile.region === "canyon"
            ? "pyroclast"
            : profile.region === "hollow"
              ? "glaciermaw"
              : "briarhart"
        }
        position={[-10, 0, -7]}
      />
      {INTERACTABLES.map((o) => (
        <group key={o.id} position={o.p as [number, number, number]}>
          {o.id.startsWith("resource") && (
            <Crystal position={[0, 0, 0]} color="#ead892" scale={0.3} />
          )}
          <Html
            position={[0, o.id === "arena" ? 4.8 : 2.25, 0]}
            center
            distanceFactor={14}
          >
            <div className="world-label">
              <span>
                {o.id === "guide"
                  ? "!"
                  : o.id === "boss"
                    ? "♜"
                    : o.id.startsWith("resource")
                      ? "✧"
                      : "◇"}
              </span>
              {o.name}
            </div>
          </Html>
        </group>
      ))}
    </Canvas>
  );
}
export function TitleScene({
  avatar = 0,
  species = "emberfox",
}: {
  avatar?: number;
  species?: string;
}) {
  return (
    <Canvas shadows camera={{ position: [8, 5.2, 12], fov: 38 }} dpr={[1, 1.5]}>
      <RenderStats />
      <Environment title />
      <group position={[2.5, 0, 2]} rotation={[0, -0.35, 0]}>
        <Avatar index={avatar} />
        <Creature id={species} position={[1.4, 0, 0.5]} scale={1.4} />
        <Creature id="puddlepip" position={[-1.3, 0, 1.2]} scale={0.75} />
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        target={[0.5, 1.3, 0]}
      />
    </Canvas>
  );
}
export function Preview({
  species,
  avatar,
  state = "idle",
  paused = false,
}: {
  species?: string;
  avatar?: number;
  state?: Motion;
  paused?: boolean;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [3, 2.5, 4.5], fov: 37 }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={["#203b41"]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <directionalLight position={[-3, 2, -3]} color="#a7e4de" intensity={2} />
      {species ? (
        <Creature id={species} state={state} paused={paused} />
      ) : (
        <Avatar index={avatar} />
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.07, 0]}
        receiveShadow
      >
        <circleGeometry args={[2.1, 48]} />
        <meshStandardMaterial color="#29484a" />
      </mesh>
      <OrbitControls
        target={[0, 0.8, 0]}
        autoRotate={!paused}
        autoRotateSpeed={0.7}
        minDistance={2}
        maxDistance={8}
      />
    </Canvas>
  );
}
export function unitPosition(
  side: number,
  slot: number,
): [number, number, number] {
  return [
    ((slot % 3) - 1) * 2.35,
    0,
    (side === 0 ? 1 : -1) * (Math.floor(slot / 3) * 2.1 + 1.9),
  ];
}
function BattleCamera({
  battle,
  preview = false,
  phase,
}: {
  battle: Battle;
  preview?: boolean;
  phase?: number;
}) {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as T.PerspectiveCamera;
    const e = battle.event;
    const p = phase ?? (e ? (Date.now() - e.at) / e.duration : 2);
    const ultimate = e?.action.endsWith("-2");
    const amount =
      !settings.reduced && ultimate && p >= 0 && p < 1
        ? Math.sin(p * Math.PI) *
          (2 +
            (byId[battle.units.find((u) => u.id === e!.actor)!.species].index %
              3))
        : 0;
    cam.fov = (preview ? 38 : 42) - amount;
    cam.setViewOffset(
      size.width,
      size.height,
      settings.shake && !settings.reduced && p > 0.43 && p < 0.57
        ? Math.sin(p * 100) * 2
        : 0,
      0,
      size.width,
      size.height,
    );
    cam.updateProjectionMatrix();
  });
  return null;
}
function SkillEffect({ battle, phase }: { battle: Battle; phase?: number }) {
  const ref = useRef<T.Group>(null);
  useFrame(() => {
    if (!ref.current || !battle.event) return;
    const p = phase ?? (Date.now() - battle.event.at) / battle.event.duration;
    ref.current.visible = p >= 0 && p < 1;
    if (p >= 1) return;
    const actor = battle.units.find((u) => u.id === battle.event!.actor)!,
      target = battle.units.find((u) => u.id === battle.event!.target)!;
    const from = new T.Vector3(...unitPosition(actor.side, actor.slot)).add(
        new T.Vector3(0, 1, 0),
      ),
      to = new T.Vector3(...unitPosition(target.side, target.slot)).add(
        new T.Vector3(0, 0.6, 0),
      );
    ref.current.position.copy(from.lerp(to, Math.min(1, p * 2)));
    ref.current.rotation.y = p * 5;
    const scale = p < 0.5 ? 0.25 + p : 1 + Math.sin((p - 0.5) * Math.PI) * 1.5;
    ref.current.scale.setScalar(settings.reduced ? 0.8 : scale);
    ref.current.children.forEach((m, i) => {
      if (m instanceof T.Mesh) m.rotation.z = p * (i % 2 ? 1 : -1) * 6;
    });
  });
  const e = battle.event;
  if (!e) return null;
  const s = byId[battle.units.find((u) => u.id === e.actor)!.species],
    ult = e.action.endsWith("-2"),
    v = s.index % 10;
  return (
    <group ref={ref} name="skill-effect">
      {ult && s.tier === "S" && (
        <UltimateEffect
          id={s.id}
          at={e.at}
          duration={e.duration}
          phase={phase}
        />
      )}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.055, 6, 32]} />
        <meshBasicMaterial color={s.color} transparent opacity={0.75} />
      </mesh>
      {Array.from(
        { length: settings.quality === "Low" ? 4 : ult ? 14 : 8 },
        (_, i) => {
          const a = i * 2.399;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * 0.6,
                Math.sin(a * 2) * 0.35,
                Math.sin(a) * 0.6,
              ]}
              rotation={[i, a, 0]}
            >
              {s.element === "Stone" || s.element === "Frost" ? (
                <octahedronGeometry args={[0.18, 0]} />
              ) : s.element === "Grove" ? (
                <coneGeometry args={[0.1, 0.5, 4]} />
              ) : s.element === "Storm" ? (
                <boxGeometry args={[0.035, 0.8, 0.035]} />
              ) : (
                <sphereGeometry args={[0.09, 6, 4]} />
              )}
              <meshBasicMaterial color={s.color} />
            </mesh>
          );
        },
      )}
      {ult &&
        s.tier === "S" &&
        Array.from({ length: 3 + (v % 4) }, (_, i) => (
          <mesh
            key={`u${i}`}
            position={[0, i * 0.3, 0]}
            rotation={[v * 0.2, i * 0.6, Math.PI / 2]}
          >
            <torusGeometry
              args={[0.7 + i * 0.25, 0.035 + (v % 3) * 0.02, 5, 32]}
            />
            <meshBasicMaterial
              color={i % 2 ? s.color : "#fff1bd"}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
    </group>
  );
}
export function BattleScene({
  battle: sourceBattle,
  target,
  onTarget,
  preview = false,
  paused = false,
  previewPhase = 0.55,
}: {
  battle: Battle;
  target: string;
  onTarget: (id: string) => void;
  preview?: boolean;
  paused?: boolean;
  previewPhase?: number;
}) {
  const [, tick] = useState(0);
  const phase = useRef(0);
  useEffect(() => {
    phase.current = 0;
  }, [sourceBattle.event?.at]);
  useEffect(() => {
    let previous = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      if (!paused) phase.current += now - previous;
      previous = now;
      tick((x) => x + 1);
    }, 50);
    return () => clearInterval(t);
  }, [paused]);
  const battle =
    preview && sourceBattle.event
      ? {
          ...sourceBattle,
          event: {
            ...sourceBattle.event,
            at:
              Date.now() -
              (paused
                ? previewPhase * sourceBattle.event.duration
                : phase.current % (sourceBattle.event.duration + 650)),
          },
          units: sourceBattle.units
            .filter(
              (u) => u.id === "0:0" || u.id === sourceBattle.event?.target,
            )
            .map((u) => ({ ...u, slot: 1 })),
        }
      : sourceBattle;
  return (
    <Canvas
      shadows
      camera={{ position: preview ? [7, 6, 10] : [10, 12, 15], fov: 42 }}
      dpr={[1, 1.5]}
    >
      <BattleCamera
        battle={battle}
        preview={preview}
        phase={preview && paused ? previewPhase : undefined}
      />
      <color attach="background" args={["#75939b"]} />
      <fog attach="fog" args={["#75939b", 25, 70]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-4, 12, 6]} intensity={2.8} castShadow />
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <cylinderGeometry args={[9, 10, 0.6, 12]} />
        <meshStandardMaterial color="#697f7c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6.9, 7, 64]} />
        <meshBasicMaterial color="#cfbc81" />
      </mesh>
      {battle.units.map((u) => {
        const p = unitPosition(u.side, u.slot),
          event = battle.event,
          elapsed =
            preview && paused
              ? previewPhase
              : event
                ? (Date.now() - event.at) / event.duration
                : 2,
          active = elapsed < 1;
        const outcome =
          event?.amounts
            .filter((a) => a.id === u.id)
            .reduce((sum, a) => sum + a.amount, 0) || 0;
        const shownHp =
          active && elapsed < 0.45
            ? Math.max(0, Math.min(u.maxHp, u.hp + outcome))
            : u.hp;
        const state: Motion =
          shownHp === 0
            ? "defeat"
            : active && event?.actor === u.id
              ? event.action.endsWith("-2")
                ? "ultimate"
                : event.action.endsWith("-1")
                  ? "cast"
                  : "attack"
              : active &&
                  elapsed >= 0.45 &&
                  event?.amounts.some((a) => a.id === u.id && a.amount > 0)
                ? "hit"
                : "idle";
        return (
          <group key={u.id} position={p} onClick={() => onTarget(u.id)}>
            <Creature
              id={u.species}
              rotation={u.side === 0 ? Math.PI : 0}
              state={state}
              phase={elapsed}
              scale={0.92}
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
              <ringGeometry args={[0.65, 0.72, 32]} />
              <meshBasicMaterial
                color={
                  target === u.id
                    ? "#f5d38a"
                    : battle.queue[0] === u.id
                      ? "#81f8dc"
                      : u.side === 0
                        ? "#83b8ac"
                        : "#bc8986"
                }
              />
            </mesh>
            {!preview && (
              <Html
                position={[0, 2.05, 0]}
                center
                distanceFactor={17}
                zIndexRange={[3, 0]}
              >
                <button
                  className={`unit-label ${target === u.id ? "selected" : ""}`}
                  onClick={() => onTarget(u.id)}
                >
                  <strong>{byId[u.species].name}</strong>
                  <span className="hp">
                    <i style={{ width: `${(shownHp / u.maxHp) * 100}%` }} />
                  </span>
                  <small>
                    {shownHp}/{u.maxHp}
                    {u.shield > 0 ? ` · ◇${u.shield}` : ""}
                  </small>
                  <span className="statuses">
                    {u.statuses.map((s) => (
                      <abbr
                        key={s.kind}
                        title={`${s.kind}: ${s.turns} round(s)`}
                      >
                        {s.kind.slice(0, 3)} {s.turns}
                      </abbr>
                    ))}
                  </span>
                  {active &&
                    elapsed > 0.4 &&
                    event?.amounts
                      .filter((a) => a.id === u.id)
                      .map((a) => (
                        <em
                          key={a.id}
                          className={a.amount < 0 ? "healing" : "damage"}
                        >
                          {a.amount === 0
                            ? a.shield > 0
                              ? `◇ +${a.shield}`
                              : ""
                            : a.amount > 0
                              ? `−${a.amount}`
                              : `+${-a.amount}`}
                        </em>
                      ))}
                </button>
              </Html>
            )}
          </group>
        );
      })}
      <SkillEffect
        battle={battle}
        phase={preview && paused ? previewPhase : undefined}
      />
      <Island position={[-22, 0, -24]} />
      <Island position={[23, 6, -38]} />
      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={preview ? 7 : 15}
        maxDistance={25}
        minPolarAngle={0.5}
        maxPolarAngle={1.1}
      />
    </Canvas>
  );
}

import { WorldInteraction } from "./WorldInteraction";
import { HavenHouses } from "./HavenHouses";
import { HavenVillage } from "./HavenVillage";
import { HavenBirds } from "./HavenBirds";
import { HavenFrontier } from "./HavenFrontier";
import { SkyferryDock } from "./Skyferry";
import { WeatherEffects } from "./Weather";
import { HavenTreasure } from "./HavenTreasure";
import { Riftgate } from "./Riftgate";
import { ModelLighting } from "./ModelLighting";
import { HavenTownsfolk } from "./HavenTownsfolk";
import { HavenShops } from "./HavenShops";
import { DayNight, SkyLife } from "./Atmosphere";
import { WalkContext, type Walker } from "./hover";
import { worldFocus } from "./village-materials";
import { buildGrid, findPath, type WalkGrid } from "../../../packages/shared/pathfind";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as T from "three";
import { byId, REGIONS } from "../../../packages/shared/content";
import { NPCS, npcSignal } from "../../../packages/shared/town";
import { TownScenery, dressCompanion } from "./TownScenery";
import { HavenTerrain } from "./HavenTerrain";
import { HavenWildlife } from "./HavenWildlife";
import {
  havenWalkable,
  HAVEN_PLACES,
  HAVEN_HOUSES,
  houseDoor,
  RESOURCE_NODES,
  resourcesForRegion,
  HAVEN,
  FISHING_SPOT,
  HAVEN_CACHES,
  HAVEN_RIFTGATE,
  shopFront,
  groundHeight,
  PIER,
  SKYFERRY,
  slideStep,
  type Point,
} from "../../../packages/shared/haven";
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
import {
  WORLD_GUIDE,
  type ExplorationInput,
  type Objective,
} from "./world-guide";
import type { MutableRefObject } from "react";
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
  const sky = title
    ? "#94b5b6"
    : region === "hollow"
      ? "#9fbacb"
      : region === "canyon"
        ? "#bb9b8d"
        : "#9bbeb5";
  const r = REGIONS.find((r) => r.id === region) || REGIONS[0];
  const canyon = region === "canyon",
    snow = region === "hollow";
  const expanded = region === "haven" && !title;
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
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[title ? "#94b5b6" : r.color, 28, expanded ? 110 : 95]} />
      {title ? (
        <>
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
        </>
      ) : (
        <>
          <DayNight sky={sky} fog={r.color} haven={region === "haven"} />
          <SkyLife radius={expanded ? 54 : 26} birds={!expanded} />
          <WeatherEffects region={region} />
        </>
      )}
      {expanded ? (
        <HavenTerrain />
      ) : (
        <>
          <mesh receiveShadow position={[0, -0.3, 0]}>
            <cylinderGeometry args={[18, 18.5, 0.6, 64]} />
            <meshStandardMaterial color={r.ground} roughness={1} />
          </mesh>
          <mesh position={[0, -3.6, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[18.4, 7, 11]} />
            <meshStandardMaterial color="#526964" flatShading />
          </mesh>
        </>
      )}
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
        .filter((t) => !expanded && (t.pos[2] < 2 || t.pos[0] < -13))
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
      <group position={expanded ? [0, -4, -48] : [0, 0, 0]}>
        <Island position={[-23, 8, -35]} scale={1.4} />
        <Island position={[24, 6, -30]} scale={0.9} />
        <Island position={[4, 14, -62]} scale={1.8} />
        <Island position={[-38, 2, -10]} scale={0.6} />
      </group>
      <mesh name="sky-orb" position={[-23, 26, -60]}>
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
      <group name="night-stars" visible={title}>
        <Stars
          radius={expanded ? 70 : 40}
          depth={20}
          count={settings.quality === "Low" ? 80 : 260}
          factor={expanded ? 2.4 : 1.2}
          saturation={0}
          fade
          speed={0.2}
        />
      </group>
      {expanded && <HavenVillage />}
      {expanded && <HavenBirds />}
      {expanded && <HavenFrontier />}
      <RegionScenery region={region} />
    </>
  );
}
export const INTERACTABLES = [
  ...HAVEN_HOUSES.map((h) => ({
    id: `porch-${h.id}`,
    name: h.name,
    hint: "Visit the porch & visitor book",
    p: [houseDoor(h)[0], 0, houseDoor(h)[1]],
  })),
  ...HAVEN_PLACES.map((p) => ({
    id: `trail-${p.id}`,
    name: p.name,
    hint: "Read the trail guide",
    p: [p.point[0], 0, p.point[1]],
  })),
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
  {
    id: "market",
    name: "Pip's market",
    hint: "Trade supplies & accessories",
    p: [11, 0, 6],
  },
  {
    id: "garden",
    name: "Wren's garden",
    hint: "Plant, craft & care",
    p: [-9, 0, 10],
  },
  {
    id: "smith",
    name: "Ironbloom Smithy",
    hint: "Gear and forge dust",
    p: [shopFront("smith")[0], 0, shopFront("smith")[1]],
  },
  {
    id: "apothecary",
    name: "Willowroot Apothecary",
    hint: "Elixirs, tomes and tonics",
    p: [shopFront("apothecary")[0], 0, shopFront("apothecary")[1]],
  },
  {
    id: "riftgate",
    name: "The Riftgate",
    hint: "Story chapters & daily dungeons",
    p: [
      HAVEN_RIFTGATE.point[0] + Math.sin(HAVEN_RIFTGATE.rotation) * 1.2,
      0,
      HAVEN_RIFTGATE.point[1] + Math.cos(HAVEN_RIFTGATE.rotation) * 1.2,
    ],
  },
  {
    id: "skyferry",
    name: "Skyferry dock",
    hint: "Sail to your home island",
    p: [SKYFERRY.point[0], 0, SKYFERRY.point[1]],
  },
  {
    id: "pierfishing",
    name: "Driftshore pier",
    hint: "Cast into the sky-sea lagoon",
    p: [PIER.x, 0, PIER.z1 - 0.6],
  },
  {
    id: "fishing",
    name: "Willowmere dock",
    hint: "Cast a line & catch fish",
    p: [FISHING_SPOT[0], 0, FISHING_SPOT[1]],
  },
  ...RESOURCE_NODES.map((n) => ({
    id: n.id,
    name: "Sunseed",
    hint: "Gather resource",
    p: [n.point[0], 0, n.point[1]],
  })),
];
// Interaction points sit on the terrain (only Havenreach has elevation).
for (const o of INTERACTABLES) o.p[1] = groundHeight(o.p[0], o.p[2]);
export const getInteractables = (region: string) =>
  INTERACTABLES.filter(
    (o) =>
      (region === "haven" ||
        (!o.id.startsWith("trail-") &&
          !o.id.startsWith("porch-") &&
          !["fishing", "pierfishing", "riftgate", "smith", "apothecary", "skyferry"].includes(o.id))) &&
      (!o.id.startsWith("resource-") ||
        resourcesForRegion(region).some((n) => n.id === o.id)),
  );
const grids = new Map<string, WalkGrid>();
/** Ground height for a region; only Havenreach has elevation. */
const groundFor = (region: string) =>
  region === "haven" ? groundHeight : () => 0;
/** Where a click ray meets the terrain, found by marching then bisecting. */
function terrainHit(ray: T.Ray, ground: (x: number, z: number) => number) {
  const p = new T.Vector3();
  let prev = 0;
  for (let t = 0.5; t < 260; t += 0.5) {
    ray.at(t, p);
    if (p.y <= ground(p.x, p.z)) {
      let lo = prev,
        hi = t;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        ray.at(mid, p);
        if (p.y <= ground(p.x, p.z)) hi = mid;
        else lo = mid;
      }
      ray.at(hi, p);
      return p;
    }
    prev = t;
  }
  return null;
}
const markerMaterial = new T.MeshBasicMaterial({
  color: "#ffe6ad",
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
/** A walkable place other than a region: an island visited by Skyferry. */
export type WalkArea = {
  /** Changes whenever walkability changes, so the path grid is rebuilt. */
  key: string;
  allowed: (x: number, z: number) => boolean;
  extent: number;
  points: { id: string; p: number[] }[];
  home: Point;
};
type Route = {
  points: Point[];
  target: Point;
  reach: number;
  activate?: () => void;
  stuck: number;
};
export function Explorer({
  profile,
  blocked,
  onNear,
  onInteract,
  onPosition,
  pet,
  input,
  spawn,
  walker,
  area,
}: {
  area?: WalkArea;
  profile: Profile;
  blocked: boolean;
  onNear: (id: string) => void;
  onInteract: (id: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
  input: MutableRefObject<ExplorationInput>;
  spawn: number[];
  walker: MutableRefObject<Walker>;
}) {
  const avatar = useMemo(() => createAvatar(profile.avatar), [profile.avatar]);
  const leader = profile.owned.find((o) => o.id === profile.team[0]);
  const companion = useMemo(
    () =>
      dressCompanion(
        createCreature(leader?.species || "emberfox"),
        leader?.accessory,
      ),
    [leader?.species, leader?.accessory],
  );
  const player = useRef(new T.Vector3(spawn[0], 0, spawn[1]));
  const keys = useRef(new Set<string>());
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const initialTarget = useMemo(() => new T.Vector3(spawn[0], 1, spawn[1]), []);
  const near = useRef("");
  const last = useRef(0);
  const foot = useRef(0);
  const follow = useRef(new T.Vector3(spawn[0] - 1, 0, spawn[1] + 1.5));
  const route = useRef<Route | null>(null),
    marker = useRef<T.Group>(null);
  const resetSeen = useRef(input.current.resetCamera || 0),
    homeSeen = useRef(input.current.returnHome || 0);
  const recenter = () => {
    const c = controls.current;
    // Spend any leftover orbit momentum first so the reset holds still.
    if (c) {
      c.enableDamping = false;
      c.update();
    }
    camera.position.set(
      player.current.x + 10,
      10 + player.current.y,
      player.current.z + 11,
    );
    if (c) {
      c.target.set(player.current.x, 1 + player.current.y, player.current.z);
      c.update();
      c.enableDamping = true;
    }
  };
  const ground = useMemo(
    () => (area ? () => 0 : groundFor(profile.region)),
    [profile.region, !!area],
  );
  const zone = area?.key ?? profile.region,
    extent = area?.extent ?? (profile.region === "haven" ? 78 : 18);
  const regionAllowed = useCallback(
    (x: number, z: number) =>
      (profile.region === "haven"
        ? havenWalkable(x, z)
        : Math.hypot(x, z) < 16.5) &&
      !blocksLandmark(profile.region, x, z) &&
      !((x - 11) ** 2 + (z - 4.4) ** 2 < 1.4) &&
      !((x - 7) ** 2 + (z + 3) ** 2 < 3.2) &&
      !((x + 6) ** 2 + (z + 3) ** 2 < 0.8),
    [profile.region],
  );
  const allowed = area?.allowed ?? regionAllowed;
  // Click-to-walk: path around obstacles, then act once within reach.
  useEffect(() => {
    walker.current = {
      go(target, reach = 0.3, activate) {
        const from: Point = [player.current.x, player.current.z];
        if (
          activate &&
          Math.hypot(target[0] - from[0], target[1] - from[1]) <= reach
        ) {
          route.current = null;
          activate();
          return;
        }
        let grid = grids.get(zone);
        if (!grid) {
          grid = buildGrid(allowed, extent);
          grids.set(zone, grid);
        }
        const points = findPath(grid, from, target, allowed);
        if (!points?.length) {
          route.current = null;
          audio.cue("error");
          return;
        }
        route.current = { points, target, reach, activate, stuck: 0 };
      },
    };
  }, [walker, allowed, zone, extent]);
  useEffect(() => {
    if (blocked) route.current = null;
  }, [blocked]);
  useEffect(() => {
    // Plan the walk grid once the scene has settled, so the first click is instant.
    const t = setTimeout(() => {
      if (!grids.has(zone)) grids.set(zone, buildGrid(allowed, extent));
    }, 1500);
    return () => clearTimeout(t);
  }, [allowed, zone, extent]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches("input,textarea,select")
      )
        return;
      keys.current.add(e.code);
      if (e.code === "KeyR" && !blocked) recenter();
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
    dt = Math.min(dt, 0.1);
    // R3F restarts its clock when switching back from a paused panel.
    if (clock.elapsedTime < last.current) {
      last.current = -1;
      foot.current = 0;
    }
    const k = keys.current;
    if ((input.current.resetCamera || 0) !== resetSeen.current) {
      resetSeen.current = input.current.resetCamera || 0;
      recenter();
    }
    if ((input.current.returnHome || 0) !== homeSeen.current) {
      homeSeen.current = input.current.returnHome || 0;
      route.current = null;
      const [hx, hz] = area?.home ?? [0, 5];
      player.current.set(hx, 0, hz);
      follow.current.set(hx - 1, 0, hz + 1.5);
      recenter();
      last.current = -1;
    }
    let x = blocked
      ? 0
      : input.current.x +
        Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft"));
    let z = blocked
      ? 0
      : input.current.z +
        Number(k.has("KeyS") || k.has("ArrowDown")) -
        Number(k.has("KeyW") || k.has("ArrowUp"));
    const steering = !!(x || z);
    if (steering || blocked) route.current = null;
    const shift =
      !blocked &&
      (input.current.sprint || k.has("ShiftLeft") || k.has("ShiftRight"));
    let v: T.Vector3 | null = null,
      sprinting = shift;
    if (steering) {
      const yaw = Math.atan2(
        camera.position.x - player.current.x,
        camera.position.z - player.current.z,
      );
      v = new T.Vector3(x, 0, z)
        .normalize()
        .applyAxisAngle(new T.Vector3(0, 1, 0), yaw)
        .multiplyScalar(
          dt *
            (sprinting ? HAVEN.sprintSpeed : HAVEN.walkSpeed) *
            Math.min(1, Math.hypot(x, z)),
        );
    } else if (route.current) {
      const r = route.current,
        px = player.current.x,
        pz = player.current.z;
      if (
        r.activate &&
        Math.hypot(r.target[0] - px, r.target[1] - pz) <= r.reach
      ) {
        route.current = null;
        r.activate();
      } else {
        if (
          r.points.length > 1 &&
          Math.hypot(r.points[0][0] - px, r.points[0][1] - pz) < 0.25
        )
          r.points.shift();
        const [gx, gz] = r.points[0],
          length = Math.hypot(gx - px, gz - pz);
        if (length < 0.25) {
          route.current = null;
          if (
            r.activate &&
            Math.hypot(r.target[0] - px, r.target[1] - pz) <= r.reach + 2
          )
            r.activate();
        } else {
          let remaining = length;
          for (let i = 1; i < r.points.length; i++)
            remaining += Math.hypot(
              r.points[i][0] - r.points[i - 1][0],
              r.points[i][1] - r.points[i - 1][1],
            );
          // Long walks break into a run, like holding Shift.
          sprinting = shift || remaining > 9;
          v = new T.Vector3(gx - px, 0, gz - pz).multiplyScalar(
            Math.min(
              length,
              dt * (sprinting ? HAVEN.sprintSpeed : HAVEN.walkSpeed),
            ) / length,
          );
        }
      }
    }
    const moving = !!v;
    if (v) {
      const [nx, nz] = slideStep(
        player.current.x,
        player.current.z,
        v.x,
        v.z,
        allowed,
      );
      const r = route.current;
      if (r) {
        const moved = Math.hypot(nx - player.current.x, nz - player.current.z);
        r.stuck = moved < v.length() * 0.2 ? r.stuck + dt : 0;
        if (r.stuck > 0.6) {
          route.current = null;
          if (
            r.activate &&
            Math.hypot(r.target[0] - nx, r.target[1] - nz) <= r.reach + 2
          )
            r.activate();
        }
      }
      // Climbing raises the keeper and lifts the camera by the same amount.
      const ny = ground(nx, nz);
      camera.position.x += nx - player.current.x;
      camera.position.y += ny - player.current.y;
      camera.position.z += nz - player.current.z;
      player.current.set(nx, ny, nz);
      avatar.rotation.y = Math.atan2(v.x, v.z);
      if (clock.elapsedTime - foot.current > (sprinting ? 0.27 : 0.32)) {
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
    worldFocus.set(player.current.x, player.current.y, player.current.z);
    if (marker.current) {
      const r = route.current;
      marker.current.visible = !!r && !r.activate;
      if (r) {
        const [ex, ez] = r.points[r.points.length - 1];
        marker.current.position.set(ex, ground(ex, ez) + 0.06, ez);
        marker.current.scale.setScalar(
          settings.reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 6) * 0.08,
        );
      }
    }
    avatar.position.x = player.current.x;
    avatar.position.z = player.current.z;
    avatar.userData.groundY = player.current.y;
    animateAvatar(avatar, clock.elapsedTime, moving, pet, settings.reduced);
    const delta = player.current.clone().sub(follow.current);
    const following = delta.length() > 1.6;
    if (following) {
      if (delta.length() > 6) follow.current.copy(player.current);
      else {
        delta.normalize().multiplyScalar(dt * (sprinting ? 7.4 : 5));
        const [fx, fz] = slideStep(
          follow.current.x,
          follow.current.z,
          delta.x,
          delta.z,
          allowed,
        );
        follow.current.set(fx, ground(fx, fz), fz);
      }
    }
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
        new T.Vector3(player.current.x, 1 + player.current.y, player.current.z),
        1 - Math.exp(-dt * 8),
      );
    if (clock.elapsedTime - last.current > 0.2) {
      let nearest = "";
      let dist = 3.3;
      for (const obj of area?.points ?? getInteractables(profile.region)) {
        if (obj.id === "trail-village") continue;
        if (
          obj.id.startsWith("resource") &&
          profile.resources.includes(`${profile.region}:${obj.id}`)
        )
          continue;
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
      <group ref={marker} visible={false} name="walk-marker">
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={markerMaterial}>
          <ringGeometry args={[0.32, 0.42, 32]} />
        </mesh>
        <mesh
          position={[0, 0.55, 0]}
          rotation={[Math.PI, 0, 0]}
          material={markerMaterial}
        >
          <coneGeometry args={[0.13, 0.3, 4]} />
        </mesh>
      </group>
      <mesh
        name="walk-ground"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        onClick={(e) => {
          if (blocked || e.delta >= 6) return;
          e.stopPropagation();
          // On slopes the ray meets the terrain before this flat catch-plane.
          const hit = terrainHit(e.ray, ground) || e.point;
          // Small pickups are easy to miss: a click right beside one still counts.
          const found = profile.town?.caches || [];
          const pickup = (area ? [] : [
            ...getInteractables(profile.region)
              .filter(
                (o) =>
                  o.id.startsWith("resource") &&
                  !profile.resources.includes(`${profile.region}:${o.id}`),
              )
              .map((o) => ({ id: o.id, x: o.p[0], z: o.p[2], reach: 2.4 })),
            ...(profile.region === "haven" ? HAVEN_CACHES : [])
              .filter((c) => !found.includes(c.id))
              .map((c) => ({
                id: `cache-${c.id}`,
                x: c.point[0],
                z: c.point[1],
                reach: 2.6,
              })),
          ]).find((o) => Math.hypot(o.x - hit.x, o.z - hit.z) < 1.1);
          if (pickup)
            walker.current.go([pickup.x, pickup.z], pickup.reach, () =>
              onInteract(pickup.id),
            );
          else walker.current.go([hit.x, hit.z]);
        }}
      >
        <planeGeometry args={[180, 180]} />
        <meshBasicMaterial visible={false} />
      </mesh>
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
  activate,
  disabled,
  title,
  hint,
}: {
  id: string;
  activate: () => void;
  disabled: boolean;
  position: [number, number, number];
  title: string;
  hint: string;
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
      <WorldInteraction
        activate={activate}
        disabled={disabled}
        title={title}
        hint={hint}
      >
        <Creature id={id} state="walk" />
      </WorldInteraction>
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
  position,
  objective,
  input,
}: {
  profile: Profile;
  blocked: boolean;
  onNear: (s: string) => void;
  onInteract: (s: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
  position: number[];
  objective: Objective;
  input: MutableRefObject<ExplorationInput>;
}) {
  const initialPosition = useMemo(() => position, [profile.region]);
  const walker = useRef<Walker>({ go: (_t, _r, act) => act?.() });
  return (
    <Canvas
      shadows
      camera={{
        position: [initialPosition[0] + 10, 10, initialPosition[1] + 11],
        fov: 45,
      }}
      frameloop={blocked ? "demand" : "always"}
      dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
    >
      <WalkContext.Provider value={walker}>
      <ModelLighting intensity={0.35} />
      <Environment region={profile.region} />
      {profile.region === "haven" && (
        <HavenHouses onInteract={onInteract} disabled={blocked} />
      )}
      {profile.region === "haven" && (
        <Riftgate onInteract={onInteract} disabled={blocked} />
      )}
      {profile.region === "haven" && (
        <HavenTownsfolk onInteract={onInteract} disabled={blocked} />
      )}
      {profile.region === "haven" && (
        <HavenShops onInteract={onInteract} disabled={blocked} />
      )}
      {profile.region === "haven" && (
        <HavenTreasure
          found={profile.town?.caches || []}
          disabled={blocked}
          onInteract={onInteract}
        />
      )}
      {profile.region === "haven" && (
        <HavenWildlife onInteract={onInteract} disabled={blocked} />
      )}
      <TownScenery garden={profile.town?.garden ?? null} />
      <Explorer
        key={profile.region}
        spawn={initialPosition}
        {...{ profile, blocked, onNear, onInteract, onPosition, pet, input }}
        walker={walker}
      />
      {NPCS.map((n) => (
        <WorldInteraction
          key={n.id}
          name={`npc-${n.id}`}
          disabled={blocked}
          title={n.name}
          hint={`${n.role} · Click to talk`}
          activate={() => onInteract(n.location)}
        >
          <Avatar index={n.avatar} position={n.position} />
        </WorldInteraction>
      ))}
      <Roamer
        id={
          profile.region === "canyon"
            ? "magmole"
            : profile.region === "hollow"
              ? "snowmew"
              : "mossprig"
        }
        activate={() => onInteract("encounter")}
        disabled={blocked}
        title="Wild encounter"
        hint="Click to meet Ranger Tali"
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
        activate={() => onInteract("boss")}
        disabled={blocked}
        title="Region guardian"
        hint="Click to challenge the guardian"
        position={[-10, 0, -7]}
      />
      {getInteractables(profile.region).map((o) => {
        const resource = o.id.startsWith("resource");
        const collected = profile.resources.includes(
          `${profile.region}:${o.id}`,
        );
        const distance = Math.hypot(position[0] - o.p[0], position[1] - o.p[2]);
        const marker = WORLD_GUIDE.markers[o.id] || { height: 2.2, icon: "◇" };
        const npc = NPCS.find((n) => n.location === o.id);
        const opacity = Math.min(
          1,
          Math.max(
            0,
            (WORLD_GUIDE.labelRange - distance) /
              (WORLD_GUIDE.labelRange - WORLD_GUIDE.labelFadeStart),
          ),
        );
        return (
          <WorldInteraction
            key={o.id}
            name={`interactable-${o.id}`}
            position={o.p as [number, number, number]}
            activate={() => onInteract(o.id)}
            disabled={blocked || (resource && collected)}
            title={o.name}
            hint={resource ? "Click to gather" : o.hint}
            reach={resource ? 2.4 : 5.5}
          >
            {o.id === "skyferry" && (
              <SkyferryDock position={[0, 0, 0]} heading={SKYFERRY.heading} />
            )}
            {(o.id === "fishing" || o.id === "pierfishing") && (
              <mesh position={[0, 0.45, -0.2]}>
                <boxGeometry args={[1.7, 0.9, 1.6]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            )}
            {resource && (
              <>
                <Crystal
                  position={[0, 0, 0]}
                  color={collected ? "#8d9c79" : "#ead892"}
                  scale={0.22}
                />
                {!collected && <ResourceSparkle />}
              </>
            )}
            {!resource &&
              !blocked &&
              opacity > 0 &&
              (o.id !== "trail-village" || objective.target === o.id) && (
                <Html
                  position={
                    npc
                      ? [
                          npc.position[0] - o.p[0],
                          2.25,
                          npc.position[2] - o.p[2],
                        ]
                      : [0, marker.height, 0]
                  }
                  center
                  occlude
                  zIndexRange={[2, 0]}
                  style={{ pointerEvents: "auto", opacity }}
                >
                  <button
                    onClick={() =>
                      walker.current.go([o.p[0], o.p[2]], 5.5, () =>
                        onInteract(o.id),
                      )
                    }
                    className={`world-label ${npc ? "npc-label" : ""} ${objective.target === o.id ? "objective-label" : ""}`}
                    data-marker={o.id}
                  >
                    <span>{npc ? npcSignal(profile, npc) : marker.icon}</span>
                    {npc ? npc.name : o.name}
                  </button>
                </Html>
              )}
            {objective.target === o.id && !blocked && <QuestBeacon />}
          </WorldInteraction>
        );
      })}
      </WalkContext.Provider>
    </Canvas>
  );
}
function ResourceSparkle() {
  const ref = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !settings.reduced) {
      ref.current.rotation.y = clock.elapsedTime * 0.7;
      ref.current.position.y = 0.58 + Math.sin(clock.elapsedTime * 2) * 0.07;
    }
  });
  return (
    <group ref={ref} position={[0, 0.58, 0]}>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          position={[i * 0.12, Math.abs(i) * 0.1, 0]}
          scale={i ? 0.5 : 1}
        >
          <octahedronGeometry args={[0.09, 0]} />
          <meshBasicMaterial color="#fff2bd" />
        </mesh>
      ))}
    </group>
  );
}
function QuestBeacon() {
  const ref = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !settings.reduced) {
      ref.current.rotation.y = clock.elapsedTime;
      ref.current.position.y = 3.15 + Math.sin(clock.elapsedTime * 2) * 0.12;
    }
  });
  return (
    <group name="quest-waypoint">
      <group ref={ref} position={[0, 3.15, 0]}>
        <mesh>
          <octahedronGeometry args={[0.23, 0]} />
          <meshBasicMaterial color="#ffe1a1" />
        </mesh>
        <mesh scale={1.5}>
          <octahedronGeometry args={[0.23, 0]} />
          <meshBasicMaterial
            color="#ffe1a1"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.75, 0.83, 48]} />
        <meshBasicMaterial color="#ffe1a1" transparent opacity={0.8} />
      </mesh>
    </group>
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
      <ModelLighting intensity={0.45} />
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
      <ModelLighting intensity={0.8} />
      <ambientLight intensity={1.5} />
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
      <ModelLighting intensity={0.55} />
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

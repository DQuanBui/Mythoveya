import { LodgeDoors } from "./LodgeDoors";
import { lodgeStops } from "../../../packages/shared/lodges";
import { RescueSites } from "./RescueSites";
import { rescueBlocked, rescueStops } from "../../../packages/shared/rescue";
import { AtlasSites } from "./AtlasSites";
import { atlasBlocked, atlasStops } from "../../../packages/shared/atlas";
import { ConservancySites } from "./ConservancySites";
import { conservancyStops, conservancyBlocked } from "../../../packages/shared/conservancy";
import { RallyCamp } from "./RallyCamp";
import { rallyHost, rallyBlocked } from "../../../packages/shared/rally";
import { meadowOf } from "../../../packages/shared/meadow";
import { MeadowTerrain } from "./MeadowTerrain";
import { MEADOW_EXTENT, MEADOW_STOPS, meadowHeight, meadowWalkable, meadowPathDistance } from "../../../packages/shared/meadow";
import { hollowOf } from "../../../packages/shared/hollow";
import { HollowTerrain } from "./HollowTerrain";
import { HOLLOW_EXTENT, HOLLOW_STOPS, hollowHeight, hollowWalkable, hollowPathDistance } from "../../../packages/shared/hollow";
import { canyonOf } from "../../../packages/shared/canyon";
import { CanyonTerrain } from "./CanyonTerrain";
import { CANYON_EXTENT, CANYON_STOPS, canyonHeight, canyonWalkable, canyonPathDistance } from "../../../packages/shared/canyon";
import { previewFrame } from "./preview-framing";
import { WildwoodScenery } from "./WildwoodScenery";
import { expeditionOf, EXPEDITION_STOPS } from "../../../packages/shared/wildwood";
import { WorldInteraction } from "./WorldInteraction";
import { HavenHouses } from "./HavenHouses";
import { HavenVillage } from "./HavenVillage";
import { HavenBirds } from "./HavenBirds";
import { HavenFrontier } from "./HavenFrontier";
import { SkyferryDock } from "./Skyferry";
import { WeatherEffects, weatherFx } from "./Weather";
import { HavenTreasure } from "./HavenTreasure";
import { photo } from "./photo";
import { Hearts } from "./Hearts";
import { Footprints, leavePrint, leavePaw } from "./Footprints";
import { Puffs } from "./Puffs";
import { emitPuff } from "./puff-buffer";
import { activeSeason } from "../../../packages/shared/seasons";
import { Riftgate } from "./Riftgate";
import { ModelLighting } from "./ModelLighting";
import { HavenTownsfolk } from "./HavenTownsfolk";
import { HavenShops } from "./HavenShops";
import { DayNight, SkyLife } from "./Atmosphere";
import { WalkContext, type Walker } from "./hover";
import { worldFocus, worldHeading, keeperEmote, EMOTES, playEmote, nightState, companionJoy, companionRest } from "./village-materials";
import { findPath, startGrid, type GridBuild, type WalkGrid } from "../../../packages/shared/pathfind";
import { buildInSlices } from "./grid-slices";
import { padInput } from "./gamepad";
import { useWildNow } from "./wild-now";
import { runs } from "./run-rule";
import { bodyReach, personalSpace, stepAside } from "./companion-space";
import { DURATION, activityPose, outingTarget, pickActivity, type Activity } from "./companion-idle";
import { lazy, Suspense, useMemo, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as T from "three";
import { byId, REGIONS } from "../../../packages/shared/content";
import { NPCS, npcSignal } from "../../../packages/shared/town";
import { TownScenery, dressCompanion, dressKeeper } from "./TownScenery";
import { HavenTerrain } from "./HavenTerrain";
import { HabitatResident, HavenWildlife } from "./HavenWildlife";
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
  PEBBLES,
  pathDistance,
  lagoonDistance,
  onBridge,
  onDock,
  onPier,
  SKYFERRY,
  slideStep,
  type Point,
} from "../../../packages/shared/haven";
import { hairColor } from "../../../packages/shared/looks";
import type { Profile } from "../../../packages/shared/types";
import {
  animateAvatar,
  animateCreature,
  watchKeeper,
  createLantern,
  createUmbrella,
  swingLantern,
  createAvatar,
  createCreature,
  type Motion,
} from "./models";
import { audio, settings } from "./audio";
import { RegionScenery, blocksLandmark } from "./RegionScenery";
import {
  WORLD_GUIDE,
  type ExplorationInput,
  type Objective,
} from "./world-guide";
import type { MutableRefObject } from "react";
import { useContextRecovery } from "./context-recovery";
import { applyEffects, frameMonitor } from "./adaptive";
import { inPuddle } from "./puddle-spots";
import { useCarried } from "./carried";
// Festival lanterns load only while a festival runs.
const SeasonalLanterns = lazy(() => import("./SeasonalLanterns").then((m) => ({ default: m.SeasonalLanterns })));
// Ambient life (motes, mist, puddles, sparrows) follows once the world is up.
const Ambience = lazy(() => import("./Ambience").then((m) => ({ default: m.Ambience })));
// Each region's own scenery and wildlife load when the keeper first goes there.
const MeadowScenery = lazy(() => import("./MeadowScenery").then((m) => ({ default: m.MeadowScenery })));
const HollowScenery = lazy(() => import("./HollowScenery").then((m) => ({ default: m.HollowScenery })));
const CanyonScenery = lazy(() => import("./CanyonScenery").then((m) => ({ default: m.CanyonScenery })));
const MeadowWildlife = lazy(() => import("./MeadowWildlife").then((m) => ({ default: m.MeadowWildlife })));
const HollowWildlife = lazy(() => import("./HollowWildlife").then((m) => ({ default: m.HollowWildlife })));
const CanyonWildlife = lazy(() => import("./CanyonWildlife").then((m) => ({ default: m.CanyonWildlife })));
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
  shimmer = false,
  state = "idle",
  phase = 0,
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  paused = false,
}: {
  id: string;
  shimmer?: boolean;
  state?: Motion;
  phase?: number;
  position?: [number, number, number];
  rotation?: number;
  scale?: number;
  paused?: boolean;
}) {
  const model = useMemo(() => createCreature(id, shimmer), [id, shimmer]);
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
  hair,
  watch = false,
}: {
  index?: number;
  walk?: boolean;
  gesture?: boolean;
  position?: [number, number, number];
  /** A dye colour for the keeper's hair. */
  hair?: string;
  /** Turn the head toward a nearby keeper (villagers). */
  watch?: boolean;
}) {
  const model = useMemo(() => {
    const m = createAvatar(index, hair);
    if (watch) watchKeeper(m);
    return m;
  }, [index, hair, watch]);
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
  expedition,
}: {
  region?: string;
  title?: boolean;
  expedition?: Profile["expedition"];
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
    snow = region === "hollow",
    meadow = region === "meadow";
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
          <DayNight sky={sky} fog={r.color} haven={region === "haven"} keeperLight />
          <SkyLife radius={expanded ? 54 : canyon || snow || meadow ? 62 : 26} birds={!expanded} />
          <WeatherEffects region={region} ground={groundFor(region)} />
          <AdaptiveEffects />
          <Suspense fallback={null}>
            <Ambience region={region} ground={groundFor(region)} />
          </Suspense>
        </>
      )}
      {expanded ? (
        <HavenTerrain />
      ) : canyon && !title ? (<CanyonTerrain />) : snow && !title ? (<HollowTerrain />) : meadow && !title ? (<MeadowTerrain />) : (
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
          color={snow ? "#dce2db" : canyon ? "#bc8c6c" : "#b7ad8a"}
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
          <meshStandardMaterial color={snow ? "#d3dfe1" : "#a89f7f"} />
        </mesh>
      ))}
      {trees
        .filter((t) => !expanded && !canyon && !snow && !meadow && (t.pos[2] < 2 || t.pos[0] < -13))
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
      {PEBBLES.map((p, i) => (
        <group
          key={i}
          visible={meadow ? meadowPathDistance(p.x,p.z)>1.5 : snow ? hollowPathDistance(p.x,p.z)>1.5 : canyon ? canyonPathDistance(p.x,p.z)>1.5 : !expanded || pathDistance(p.x, p.z) > 1.3}
          position={[p.x, (expanded ? groundHeight(p.x,p.z) : canyon ? canyonHeight(p.x,p.z) : snow ? hollowHeight(p.x,p.z) : meadow ? meadowHeight(p.x,p.z) : 0) + .06, p.z]}
        >
          <mesh rotation={[0, i, 0.2]}>
            <dodecahedronGeometry args={[p.size, 0]} />
            <meshStandardMaterial
              color={
                i % 4 === 0 ? "#ecbfa6" : i % 4 === 1 ? "#d3d8a4" : r.ground
              }
            />
          </mesh>
        </group>
      ))}
      <group position={expanded || canyon || snow || meadow ? [0, -4, -48] : [0, 0, 0]}>
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
      {expanded && <HavenVillage restored={expedition?.restored === true} />}
      {expanded && <WildwoodScenery repaired={expedition?.repaired || []} restored={expedition?.restored === true} />}
      {expanded && <HavenBirds />}
      {expanded && <HavenFrontier />}
      <RegionScenery region={region} />
    </>
  );
}
export const INTERACTABLES = [
  ...EXPEDITION_STOPS.map((s) => ({ id: s.id, name: s.name, hint: s.text, p: [s.point[0], 0, s.point[1]] })),
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
// Interaction points sit on the terrain (using each region's ground height).
for (const o of INTERACTABLES) o.p[1] = groundHeight(o.p[0], o.p[2]);
export const getInteractables = (region: string) =>
  [...lodgeStops(region).map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],groundFor(region)(...s.point),s.point[1]]})), ...rescueStops(region).map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],groundFor(region)(...s.point),s.point[1]]})), ...atlasStops(region).map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],groundFor(region)(...s.point),s.point[1]]})), ...conservancyStops(region).map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],groundFor(region)(...s.point),s.point[1]]})), ...(rallyHost(region) ? [{id:rallyHost(region)!.id,name:rallyHost(region)!.name,hint:rallyHost(region)!.description,p:[rallyHost(region)!.point[0],groundFor(region)(...rallyHost(region)!.point),rallyHost(region)!.point[1]]}] : []), ...(region === "meadow" ? MEADOW_STOPS.map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],meadowHeight(...s.point),s.point[1]]})) : []), ...(region === "hollow" ? HOLLOW_STOPS.map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],hollowHeight(...s.point),s.point[1]]})) : []), ...(region === "canyon" ? CANYON_STOPS.map(s=>({id:s.id,name:s.name,hint:s.description,p:[s.point[0],canyonHeight(...s.point),s.point[1]]})) : []), ...INTERACTABLES.filter(
    (o) =>
      (region === "haven" ||
        (!o.id.startsWith("exp-") && !o.id.startsWith("trail-") &&
          !o.id.startsWith("porch-") &&
          !["fishing", "pierfishing", "riftgate", "smith", "apothecary", "skyferry"].includes(o.id))) &&
      (!o.id.startsWith("resource-") ||
        resourcesForRegion(region).some((n) => n.id === o.id)),
  ).map(o=>region === "haven" ? o : ({...o,p:[o.p[0],region === "canyon" ? canyonHeight(o.p[0],o.p[2]) : region === "hollow" ? hollowHeight(o.p[0],o.p[2]) : region === "meadow" ? meadowHeight(o.p[0],o.p[2]) : 0,o.p[2]]}))];
const grids = new Map<string, WalkGrid>();
const gridBuilds = new Map<string, GridBuild>();
/** Ground height for a region; including expanded snowy and canyon terrain. */
/** Footstep cue for the surface underfoot, matching how the ground is drawn. */
function stepSound(region: string, x: number, z: number, y: number) {
  if (region === "hollow") return "snowStep";
  if (region === "canyon") return "stoneStep";
  if (region !== "haven") return "grass";
  if (onDock(x, z) || onPier(x, z) || onBridge(x, z)) return "woodStep";
  if (y > 10.5) return "snowStep";
  if (lagoonDistance(x, z) < 1.38) return "sandStep";
  if (y > 2 || pathDistance(x, z) < 1.1) return "stoneStep";
  return "grass";
}
const COMPANION_GAZE = { x: 0, y: 0.5 };
/** Feeds the frame time to the adaptive-effects monitor (see adaptive.ts). */
function AdaptiveEffects() {
  const monitor = useMemo(() => frameMonitor(), []);
  useFrame((_, dt) => applyEffects(settings.effects, monitor, dt * 1000));
  return null;
}
const groundFor = (region: string) =>
  region === "haven" ? groundHeight : region === "canyon" ? canyonHeight : region === "hollow" ? hollowHeight : region === "meadow" ? meadowHeight : () => 0;
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
  /** Footstep cue for the whole area, e.g. plank floors indoors. */
  step?: string;
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
  const outfit = profile.festival?.outfit;
  const hair = hairColor(profile);
  const avatar = useMemo(
    () => dressKeeper(createAvatar(profile.avatar, hair), outfit),
    [profile.avatar, outfit, hair],
  );
  // After dark the keeper carries a small lantern in the right hand, and in
  // the rain a broad leaf held up in the other.
  const lantern = useCarried(avatar, 3, () => createLantern("keeper-lantern"));
  const umbrella = useCarried(avatar, 1, () => createUmbrella("keeper-umbrella"));
  const leader = profile.owned.find((o) => o.id === profile.team[0]);
  const companion = useMemo(
    () =>
      dressCompanion(
        createCreature(leader?.species || "emberfox", leader?.shimmer),
        leader?.accessory,
      ),
    [leader?.species, leader?.accessory, leader?.shimmer],
  );
  const reach = useMemo(() => bodyReach(companion), [companion]);
  const player = useRef(new T.Vector3(spawn[0], 0, spawn[1]));
  const keys = useRef(new Set<string>());
  const { camera, gl, scene } = useThree();
  const controls = useRef<any>(null);
  // Photo mode renders a fresh frame and reads it back in the same task.
  useEffect(() => {
    photo.grab = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      photo.grab = null;
    };
  }, [gl, scene, camera]);
  const initialTarget = useMemo(() => new T.Vector3(spawn[0], 1, spawn[1]), []);
  const near = useRef("");
  const last = useRef(0);
  const foot = useRef(0);
  const breath = useRef(0);
  const paw = useRef(0);
  const sparkle = useRef(0);
  const wetFeet = useRef(0);
  const sneezed = useRef(-9);
  const sneezeNext = useRef(12);
  const puffed = useRef(false);
  const shook = useRef(-9);
  const wasFollowing = useRef(false);
  // Something the companion is doing on its own while it waits.
  const activity = useRef<{ kind: Activity; start: number; from: { x: number; z: number }; to: { x: number; z: number } } | null>(null),
    nextActivity = useRef(4),
    activities = useRef(0);
  const follow = useRef(new T.Vector3(spawn[0] - 1, 0, spawn[1] + 1.5)),
    rest = useRef(0);
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
    extent = area?.extent ?? (profile.region === "haven" ? 78 : profile.region === "canyon" ? CANYON_EXTENT : profile.region === "hollow" ? HOLLOW_EXTENT : profile.region === "meadow" ? MEADOW_EXTENT : 18);
  const regionAllowed = useCallback(
    (x: number, z: number) =>
      (profile.region === "haven"
        ? havenWalkable(x, z)
        : profile.region === "canyon" ? canyonWalkable(x,z) : profile.region === "hollow" ? hollowWalkable(x,z) : profile.region === "meadow" ? meadowWalkable(x,z) : Math.hypot(x, z) < 16.5 &&
          // Smaller regions share the village stations and pebbles.
          !((x - 11) ** 2 + (z - 4.4) ** 2 < 1.4) &&
          !((x - 7) ** 2 + (z + 3) ** 2 < 3.2) &&
          !((x + 6) ** 2 + (z + 3) ** 2 < 1.1) &&
          !(Math.abs(x - 1) > 1.6 && Math.abs(x - 1) < 2.4 && Math.abs(z + 6) < 0.5) &&
          !PEBBLES.some((p) => p.size > 0.2 && Math.hypot(x - p.x, z - p.z) < p.size + 0.12)) &&
      !blocksLandmark(profile.region, x, z) && !rallyBlocked(profile.region,x,z) && !conservancyBlocked(profile.region,x,z) && !atlasBlocked(profile.region,x,z) && !rescueBlocked(profile.region,x,z),
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
          // Clicked before the background build finished: complete it now.
          const build = gridBuilds.get(zone) ?? startGrid(allowed, extent);
          build.step();
          grid = build.grid;
          grids.set(zone, grid);
          gridBuilds.delete(zone);
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
    // Plan the walk grid in slices once the scene has settled, so the first
    // click is instant and building it never holds up a frame.
    if (grids.has(zone)) return;
    const build = gridBuilds.get(zone) ?? startGrid(allowed, extent);
    gridBuilds.set(zone, build);
    let cancel = () => {};
    const t = setTimeout(() => {
      cancel = buildInSlices(build, () => {
        grids.set(zone, build.grid);
        gridBuilds.delete(zone);
      });
    }, 1500);
    return () => {
      clearTimeout(t);
      cancel();
    };
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
      const emote = !blocked && /^Digit[1-4]$/.test(e.code) ? EMOTES[Number(e.code.slice(5)) - 1] : null;
      if (emote) playEmote(emote.id);
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
    if (input.current.walkTarget && !blocked) {
      const id = input.current.walkTarget; delete input.current.walkTarget;
      const stop = (area?.points ?? getInteractables(profile.region)).find((p) => p.id === id);
      if (stop) walker.current.go([stop.p[0], stop.p[2]], .8, () => onInteract(stop.id));
    }
    let x = blocked
      ? 0
      : input.current.x +
        padInput.x +
        Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft"));
    let z = blocked
      ? 0
      : input.current.z +
        padInput.z +
        Number(k.has("KeyS") || k.has("ArrowDown")) -
        Number(k.has("KeyW") || k.has("ArrowUp"));
    const steering = !!(x || z);
    if (padInput.turn && !blocked && controls.current)
      controls.current.setAzimuthalAngle(controls.current.getAzimuthalAngle() - padInput.turn * Math.min(dt, 0.05) * 2.2);
    if (steering || blocked) route.current = null;
    const shift =
      !blocked &&
      runs(settings.alwaysRun, k.has("ShiftLeft") || k.has("ShiftRight"), !!input.current.sprint || padInput.sprint);
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
      worldHeading.yaw = avatar.rotation.y;
      if (clock.elapsedTime - foot.current > (sprinting ? 0.27 : 0.32)) {
        const step = area?.step || stepSound(profile.region, nx, nz, ny);
        audio.cue(step);
        if (step === "snowStep" || step === "sandStep") leavePrint(nx, ny, nz, avatar.rotation.y, clock.elapsedTime, step === "snowStep");
        // Out of a puddle, the next few steps leave wet prints on any ground.
        if (wetFeet.current > 0 && step !== "snowStep" && step !== "sandStep") {
          wetFeet.current--;
          leavePrint(nx, ny, nz, avatar.rotation.y, clock.elapsedTime, false, true);
        }
        // Stepping in a full puddle throws up a little splash.
        if (profile.region === "haven" && !area && inPuddle(nx, nz)) {
          wetFeet.current = 6;
          audio.cue("splash");
          for (let k = 0; k < 3; k++) {
            const a = avatar.rotation.y + (k - 1) * 1.3;
            emitPuff(nx, ny + 0.06, nz, Math.sin(a), Math.cos(a), clock.elapsedTime, "splash");
          }
        }
        // A sprint kicks up dust on paths, stone and sand, and powder in snow.
        if (sprinting && (step === "stoneStep" || step === "sandStep" || step === "snowStep")) {
          const bx = -Math.sin(avatar.rotation.y),
            bz = -Math.cos(avatar.rotation.y);
          emitPuff(nx + bx * 0.25, ny + 0.08, nz + bz * 0.25, bx, bz, clock.elapsedTime, step === "snowStep" ? "snow" : "dust");
        }
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
    // Moving or an expired timer ends an emote.
    if (moving || Date.now() > keeperEmote.until) keeperEmote.name = "";
    // Moonfrost's nights are cold enough to shiver.
    avatar.userData.cold = profile.region === "hollow" && !area && nightState.glow > 0.5;
    // Standing about, the keeper glances at the companion every few seconds.
    avatar.userData.watch = follow.current;
    avatar.userData.watchPaused = moving || !!keeperEmote.name || clock.elapsedTime % 7 > 2.6;
    animateAvatar(avatar, clock.elapsedTime, moving, pet, settings.reduced, keeperEmote.name);
    // In Moonfrost's cold, keeper and companion breathe little clouds.
    if (profile.region === "hollow" && !area && clock.elapsedTime - breath.current > (moving ? 1.1 : 1.8)) {
      breath.current = clock.elapsedTime;
      const fx = Math.sin(avatar.rotation.y),
        fz = Math.cos(avatar.rotation.y),
        [hy, hz] = companion.userData.headAt,
        size = companion.scale.x,
        cy = companion.rotation.y;
      emitPuff(player.current.x + fx * 0.22, player.current.y + 1.5, player.current.z + fz * 0.22, fx, fz, clock.elapsedTime, "breath");
      emitPuff(follow.current.x + Math.sin(cy) * (hz + 0.35) * size, follow.current.y + hy * size, follow.current.z + Math.cos(cy) * (hz + 0.35) * size, Math.sin(cy), Math.cos(cy), clock.elapsedTime + 0.5, "breath");
    }
    // The lantern hangs plumb whatever the arm is doing, with a little sway.
    lantern.visible = !area && nightState.glow > 0.45 && !keeperEmote.name;
    if (lantern.visible) swingLantern(lantern, clock.elapsedTime, moving, settings.reduced);
    umbrella.visible = !area && weatherFx.rain > 0.35 && !weatherFx.snow && !keeperEmote.name;
    if (umbrella.visible) swingLantern(umbrella, clock.elapsedTime * 0.5, moving, settings.reduced);
    const delta = player.current.clone().sub(follow.current);
    // The companion keeps room for its own body: it follows once the keeper is
    // a little way off (closer after dark) and steps aside if walked into.
    const space = personalSpace(reach, !area && nightState.glow > 0.6);
    // While it waits, the companion finds things to do: a sniff about (at
    // anything still to be gathered nearby), a lap round the keeper, a dig,
    // a pounce or a good look around. Any move of the keeper's ends it.
    const free =
      !moving && !pet && !keeperEmote.name && Date.now() >= companionJoy.until && !settings.reduced && rest.current < 12 &&
      clock.elapsedTime - shook.current > 0.9 && clock.elapsedTime - sneezed.current > 0.9;
    let act = activity.current;
    if (act && (!free || clock.elapsedTime - act.start > DURATION[act.kind])) {
      activity.current = act = null;
      nextActivity.current = clock.elapsedTime + 2.5 + ((clock.elapsedTime * 3.7) % 3);
    }
    if (!act && free && rest.current > 2.5 && clock.elapsedTime > nextActivity.current && delta.length() <= space.follow) {
      const kind = pickActivity(activities.current++, companion.userData.index || 0),
        from = { x: follow.current.x, z: follow.current.z },
        keeperAt = { x: player.current.x, z: player.current.z };
      let interest: { x: number; z: number } | undefined;
      if (kind === "explore" && !area)
        for (const obj of getInteractables(profile.region))
          if (
            obj.id.startsWith("resource") &&
            !profile.resources.includes(`${profile.region}:${obj.id}`) &&
            Math.hypot(obj.p[0] - from.x, obj.p[2] - from.z) < 7
          )
            interest = { x: obj.p[0], z: obj.p[2] };
      act = activity.current = { kind, start: clock.elapsedTime, from, to: outingTarget(from, keeperAt, clock.elapsedTime % 1, interest) };
      // A lap needs room to pass the keeper without brushing them.
      if (kind === "circle" && delta.length() < space.min + 0.2) act.kind = "play";
    }
    const pose = act ? activityPose(act.kind, (clock.elapsedTime - act.start) / DURATION[act.kind], act.from, { x: player.current.x, z: player.current.z }, act.to) : null;
    let heading: number | null = null;
    if (pose) {
      const mx = pose.x - follow.current.x,
        mz = pose.z - follow.current.z,
        d = Math.hypot(mx, mz),
        step = Math.min(d, dt * 4.5);
      if (d > 0.02) {
        const [ax, az] = slideStep(follow.current.x, follow.current.z, (mx / d) * step, (mz / d) * step, allowed);
        if (Math.hypot(ax - follow.current.x, az - follow.current.z) < step * 0.3) activity.current = null;
        follow.current.set(ax, ground(ax, az), az);
        heading = Math.atan2(mx, mz);
      }
    }
    const following = !pose && delta.length() > space.follow,
      aside = following ? null : stepAside(delta.x, delta.z, space.min, dt);
    if (aside) {
      const [ax, az] = slideStep(follow.current.x, follow.current.z, aside[0], aside[1], allowed);
      follow.current.set(ax, ground(ax, az), az);
    }
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
        // A shimmering companion trails a few sparkles as it goes.
        if (leader?.shimmer && clock.elapsedTime - sparkle.current > 0.2) {
          sparkle.current = clock.elapsedTime;
          const a = clock.elapsedTime * 7;
          emitPuff(fx + Math.cos(a) * 0.25, follow.current.y + 0.5 + Math.sin(a * 1.3) * 0.2, fz + Math.sin(a) * 0.25, -delta.x, -delta.z, clock.elapsedTime, "sparkle");
        }
        // The companion leaves paw prints where the keeper leaves footprints.
        if (clock.elapsedTime - paw.current > (sprinting ? 0.17 : 0.22)) {
          paw.current = clock.elapsedTime;
          const step = area ? "" : stepSound(profile.region, fx, fz, follow.current.y);
          // ...and splashes straight through any full puddle.
          if (profile.region === "haven" && !area && inPuddle(fx, fz))
            for (const side of [-1, 1]) emitPuff(fx, follow.current.y + 0.05, fz, Math.cos(side), side * 0.8, clock.elapsedTime, "splash");
          if (step === "snowStep" || step === "sandStep") leavePaw(fx, follow.current.y, fz, Math.atan2(delta.x, delta.z), clock.elapsedTime, step === "snowStep");
        }
      }
    }
    companion.position.copy(follow.current);
    companion.rotation.y =
      heading ??
      Math.atan2(
        player.current.x - follow.current.x,
        player.current.z - follow.current.z,
      );
    // A dig throws up a little earth.
    if (pose?.motion === "dig" && clock.elapsedTime - paw.current > 0.18) {
      paw.current = clock.elapsedTime;
      const cy = companion.rotation.y;
      emitPuff(follow.current.x + Math.sin(cy) * 0.3, follow.current.y + 0.05, follow.current.z + Math.cos(cy) * 0.3, -Math.sin(cy), -Math.cos(cy), clock.elapsedTime, "dust");
    }
    // Stopping after a walk in the rain, the companion shakes itself dry.
    if (wasFollowing.current && !following && weatherFx.rain > 0.35 && !area) {
      shook.current = clock.elapsedTime;
      const [hy] = companion.userData.headAt,
        size = companion.scale.x;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        emitPuff(follow.current.x, follow.current.y + hy * size * 0.6, follow.current.z, Math.cos(a), Math.sin(a), clock.elapsedTime + 0.1 + i * 0.04, "drop");
      }
    }
    wasFollowing.current = following;
    const shaking = clock.elapsedTime - shook.current < 0.9;
    // Whisperleaf's pollen sets a waiting companion sneezing now and then.
    if (profile.region === "meadow" && !area && !following && !moving && rest.current < 12 && clock.elapsedTime > sneezeNext.current) {
      sneezed.current = clock.elapsedTime;
      sneezeNext.current = clock.elapsedTime + 16 + ((clock.elapsedTime * 7.3) % 14);
    }
    const sneezing = !following && clock.elapsedTime - sneezed.current < 0.9;
    if (sneezing && !puffed.current && clock.elapsedTime - sneezed.current > 0.5) {
      puffed.current = true;
      const cy = companion.rotation.y,
        [hy, hz] = companion.userData.headAt,
        size = companion.scale.x;
      emitPuff(follow.current.x + Math.sin(cy) * (hz + 0.3) * size, follow.current.y + hy * size * 0.9, follow.current.z + Math.cos(cy) * (hz + 0.3) * size, Math.sin(cy), Math.cos(cy), clock.elapsedTime, "breath");
    }
    if (!sneezing) puffed.current = false;
    // Waiting at the keeper's side, the companion looks up at them.
    companion.userData.gaze = !pose && !following && !moving && delta.length() < 2.4 ? COMPANION_GAZE : null;
    companionRest.napping = !area && rest.current > 14 && !following;
    companionRest.at.copy(follow.current);
    companionRest.top = companion.userData.headAt[0] * companion.scale.x + 0.25;
    // Left waiting long enough, the companion curls up for a nap (its own
    // little outings don't count towards it).
    rest.current = following || moving || pet || Date.now() < companionJoy.until || (keeperEmote.name && keeperEmote.name !== "sit") ? 0 : rest.current + (pose ? 0 : dt);
    animateCreature(
      companion,
      clock.elapsedTime,
      // The companion joins in: it hops at a wave, plays along with a cheer or
      // dance, and settles down low when the keeper sits (later dozing off).
      pose ? pose.motion : shaking && !following ? "shake" : sneezing ? "sneeze" : pet || keeperEmote.name === "wave" || (!following && Date.now() < companionJoy.until) ? "victory" : following ? "walk" : keeperEmote.name === "cheer" || keeperEmote.name === "dance" ? "play" : keeperEmote.name === "sit" && rest.current < 14 ? "guard" : rest.current > 14 ? "sleep" : rest.current > 12.6 ? "stretch" : "idle",
      pose ? pose.phase : shaking ? (clock.elapsedTime - shook.current) / 0.9 : sneezing ? (clock.elapsedTime - sneezed.current) / 0.9 : rest.current > 12.6 && rest.current <= 14 ? (rest.current - 12.6) / 1.4 : 0,
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
      <Hearts active={pet} target={companion} />
      <Footprints />
      <Puffs />
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
/** Starts every shader in the scene compiling together right after it mounts.
 * Browsers link programs off the main thread, so asking for them all at once
 * spares the first frames from waiting on each one in turn. Goes last so that
 * everything mounted beside it is already in the scene. */
function WarmShaders() {
  const gl = useThree((s) => s.gl),
    scene = useThree((s) => s.scene),
    camera = useThree((s) => s.camera);
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  return null;
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
  const wildOut = useWildNow(profile.region, profile.wins);
  const recover = useContextRecovery("world");
  const initialPosition = useMemo(() => position, [profile.region]);
  const walker = useRef<Walker>({ go: (_t, _r, act) => act?.() });
  const season = useMemo(() => activeSeason(), []);
  return (
    <Canvas
      key={recover.key}
      onCreated={recover.onCreated}
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
      <Environment region={profile.region} expedition={expeditionOf(profile)} />
      <LodgeDoors region={profile.region} onInteract={onInteract} disabled={blocked}/>
      <RescueSites profile={profile} onInteract={onInteract} disabled={blocked}/>
      <AtlasSites profile={profile} onInteract={onInteract} disabled={blocked}/>
          <ConservancySites profile={profile} onInteract={onInteract} disabled={blocked}/>
      <RallyCamp region={profile.region} onInteract={onInteract} disabled={blocked}/>
      {profile.region === "meadow" && <Suspense fallback={null}><MeadowScenery journey={meadowOf(profile)} onInteract={onInteract} disabled={blocked} /><MeadowWildlife onInteract={onInteract} disabled={blocked}/></Suspense>}
      {profile.region === "hollow" && <Suspense fallback={null}><HollowScenery journey={hollowOf(profile)} onInteract={onInteract} disabled={blocked} /><HollowWildlife onInteract={onInteract} disabled={blocked}/></Suspense>}
      {profile.region === "canyon" && <Suspense fallback={null}><CanyonScenery beacons={canyonOf(profile).beacons} restored={canyonOf(profile).restored} onInteract={onInteract} disabled={blocked} /><CanyonWildlife onInteract={onInteract} disabled={blocked}/></Suspense>}
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
      {profile.region === "haven" && season && (
        <Suspense fallback={null}>
          <SeasonalLanterns
            season={season.season}
            found={profile.seasons?.key === season.key ? profile.seasons.found : []}
            disabled={blocked}
            onInteract={onInteract}
          />
        </Suspense>
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
          <Avatar index={n.avatar} position={n.position} watch />
        </WorldInteraction>
      ))}
      {/* Who is about only at this hour or in this weather wanders just behind
          the encounter spot (beyond its label from the camera), once the
          keeper can meet them. */}
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
        hint={wildOut.length ? `${wildOut.map((id) => byId[id].name).join(", ")} ${wildOut.length > 1 ? "are" : "is"} out now · Click to meet Ranger Tali` : "Click to meet Ranger Tali"}
        position={[-6, 0, 6]}
      />
      {wildOut.slice(0, 2).map((species, i) => (
        <HabitatResident
          key={species}
          site={{ species, point: i ? [-3.8, 2.6] : [-8.8, 3.2], radius: 1.2 }}
          index={9 + i}
          onInteract={onInteract}
          interactId="encounter"
          disabled={blocked}
        />
      ))}
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
              (!["trail-village", "trail-windrest", "trail-fieldstation"].includes(o.id) || objective.target === o.id) && (
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
      <WarmShaders />
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
function PreviewCamera({ model }: { model: T.Object3D }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const fit = previewFrame(model, size.width / Math.max(1, size.height));
    camera.position.copy(fit.position);
    camera.lookAt(fit.center);
    camera.updateProjectionMatrix();
  }, [camera, model, size.width, size.height]);
  return null;
}
export function Preview({
  species,
  shimmer = false,
  avatar,
  hair,
  state = "idle",
  paused = false,
}: {
  species?: string;
  shimmer?: boolean;
  avatar?: number;
  hair?: string;
  state?: Motion;
  paused?: boolean;
}) {
  const framingModel = useMemo(() => species ? createCreature(species, shimmer) : createAvatar(avatar || 0, hair), [species, shimmer, avatar, hair]);
  const center = useMemo(() => previewFrame(framingModel, 1).center.toArray() as [number, number, number], [framingModel]);
  return (
    <Canvas
      shadows
      camera={{ position: [3, 2.5, 4.5], fov: 37 }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={["#203b41"]} />
      <PreviewCamera model={framingModel} />
      <ModelLighting intensity={0.55} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 4]} intensity={2} />
      <directionalLight position={[-3, 2, -3]} color="#a7e4de" intensity={1} />
      {species ? (
        <Creature id={species} shimmer={shimmer} state={state} paused={paused} />
      ) : (
        <Avatar index={avatar} hair={hair} />
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
        target={center}
        autoRotate={!paused}
        autoRotateSpeed={0.7}
        minDistance={2}
        maxDistance={40}
      />
    </Canvas>
  );
}

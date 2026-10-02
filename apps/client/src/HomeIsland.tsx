import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as T from "three";
import { byId } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import {
  HOME_EXPANSIONS,
  HOUSE_YARD,
  catalogEntry,
  defaultHome,
  habitatStored,
  homeRadius,
  homeWalkable,
  houseHalf,
  islandArrival,
  islandDock,
  placementError,
  type CatalogEntry,
  type HomeItem,
  type HomeState,
} from "../../../packages/shared/islands";
import { Kit, SHAPES } from "./village-kit";
import { lampGlow } from "./village-materials";
import { ChimneySmoke, villageMaterial } from "./HavenVillage";
import { DayNight, SkyLife } from "./Atmosphere";
import { WeatherEffects } from "./Weather";
import { ModelLighting } from "./ModelLighting";
import { WorldInteraction } from "./WorldInteraction";
import { WalkContext, type Walker } from "./hover";
import { Explorer, type WalkArea } from "./Scene";
import { SkyferryDock } from "./Skyferry";
import { animateCreature, createCreature } from "./models";
import { audio, settings } from "./audio";
import type { ExplorationInput } from "./world-guide";

export type Placing = { kind: string; uid?: string; rot: number };
const UP = new T.Vector3(0, 1, 0);
type Built = { solid: T.BufferGeometry; glow: T.BufferGeometry };
const ELEMENT_COLORS: Record<string, [string, string, string]> = {
  Flame: ["#c99a72", "#e2683f", "#f3b04f"],
  Tide: ["#c7c09a", "#5fa7bb", "#bfe3e6"],
  Grove: ["#8fb17b", "#5f8e5a", "#c6dc8f"],
  Stone: ["#b6ab92", "#8b8577", "#d2c7aa"],
  Storm: ["#a9b4b5", "#e7cf5b", "#eef1ee"],
  Frost: ["#dfe8e8", "#9fcfe0", "#f6fbfb"],
  Light: ["#e2d6a4", "#f2c75e", "#fff4cf"],
  Shadow: ["#7f7790", "#9e7fc8", "#e6e0f2"],
};

// One merged model per house level; the door always faces the dock (+Z).
function houseGeometry(level: number) {
  const k = new Kit(),
    glow = new Kit(),
    w = level >= 4 ? 5.6 : level >= 2 ? 4.6 : 4,
    d = level >= 4 ? 4.6 : level >= 2 ? 4 : 3.6,
    h = level >= 2 ? 4 : 2.3;
  k.box("#a39886", [0, 0.15, 0], [w + 0.4, 0.3, d + 0.4]);
  k.box("#efe4cc", [0, 0.3 + h / 2, 0], [w, h, d]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) k.box("#8c6e52", [(sx * w) / 2, 0.3 + h / 2, (sz * d) / 2], [0.22, h, 0.22]);
  if (level >= 2) k.box("#8c6e52", [0, 2.35, 0], [w + 0.05, 0.16, d + 0.05]);
  k.add(SHAPES.GABLE, level >= 4 ? "#6f8fa6" : "#c56f58", [0, 0.3 + h, 0], [w + 0.7, 1.8 + level * 0.1, d + 0.6]);
  k.box("#7b5b43", [0, 1.05, d / 2 + 0.02], [0.9, 1.5, 0.08]);
  glow.add(SHAPES.BALL, "#fff", [0.62, 1.6, d / 2 + 0.15], [0.09, 0.12, 0.09]);
  for (const row of level >= 2 ? [1.3, 3.2] : [1.3])
    for (const x of row > 2 ? [-w / 4, w / 4] : [-w / 2 + 0.85, w / 2 - 0.85]) {
      glow.box("#fff", [x, row, d / 2 + 0.04], [0.65, 0.6, 0.04]);
      k.box("#8c6e52", [x, row - 0.36, d / 2 + 0.1], [0.8, 0.08, 0.16]);
      if (level >= 1) k.add(SHAPES.BALL, row > 2 ? "#e7a0b0" : "#e1c35f", [x, row - 0.28, d / 2 + 0.16], [0.32, 0.12, 0.1]);
    }
  for (const sx of [-1, 1]) glow.box("#fff", [(sx * w) / 2 + sx * 0.03, 1.3, 0], [0.04, 0.6, 0.6]);
  // Chimney.
  k.box("#a1907c", [w / 2 - 0.8, 0.3 + h + 1.1, -0.6], [0.55, 1.8, 0.55]);
  const smoke = [new T.Vector3(w / 2 - 0.8, 0.3 + h + 2.1, -0.6)];
  if (level >= 1) {
    // Covered porch on posts.
    k.box("#b49c78", [0, 0.32, d / 2 + 0.9], [w * 0.7, 0.1, 1.6]);
    for (const sx of [-1, 1]) k.add(SHAPES.CYL6, "#8c6e52", [sx * w * 0.33, 1.2, d / 2 + 1.55], [0.08, 1.8, 0.08]);
    k.box("#c56f58", [0, 2.15, d / 2 + 0.9], [w * 0.75, 0.12, 1.8], [0.18, 0, 0]);
  }
  if (level >= 3) {
    // A round corner tower with a lantern room.
    k.push([-w / 2, 0, -d / 2]);
    k.add(SHAPES.CYL, "#e6dac0", [0, 2.9, 0], [1.05, 5.8, 1.05]);
    glow.add(SHAPES.CYL, "#fff", [0, 4.6, 0], [1.07, 0.5, 1.07]);
    k.add(SHAPES.CONE, "#6f8fa6", [0, 6.6, 0], [1.35, 1.8, 1.35]);
    k.add(SHAPES.CYL6, "#5d4a3a", [0, 7.9, 0], [0.04, 0.9, 0.04]);
    k.box("#d67b5d", [0.3, 8.1, 0], [0.55, 0.32, 0.03]);
    k.pop();
  }
  if (level >= 4) {
    k.push([w / 2, 0, -d / 2]);
    k.add(SHAPES.CYL, "#e6dac0", [0, 2.6, 0], [0.9, 5.2, 0.9]);
    k.add(SHAPES.CONE, "#6f8fa6", [0, 5.9, 0], [1.15, 1.6, 1.15]);
    k.pop();
    k.box("#8c6e52", [0, 2.45, d / 2 + 0.45], [w * 0.5, 0.12, 0.9]);
    for (let i = -3; i <= 3; i++) k.box("#8c6e52", [i * 0.38, 2.75, d / 2 + 0.88], [0.05, 0.5, 0.05]);
  }
  return { solid: k.build(), glow: glow.build(), smoke };
}

function decorGeometry(kind: string): Built {
  const k = new Kit(),
    glow = new Kit();
  switch (kind) {
    case "oak":
      k.add(SHAPES.CYL6, "#7a6650", [0, 0.7, 0], [0.16, 1.4, 0.16]);
      k.add(SHAPES.BUSH, "#86a96f", [0, 1.95, 0], [0.95, 0.8, 0.95]);
      k.add(SHAPES.BUSH, "#9cbb7f", [0.35, 2.4, 0.2], [0.55, 0.5, 0.55]);
      break;
    case "pine":
      k.add(SHAPES.CYL6, "#7a6650", [0, 0.5, 0], [0.14, 1, 0.14]);
      k.add(SHAPES.CONE, "#5f8d78", [0, 1.6, 0], [0.85, 1.7, 0.85]);
      k.add(SHAPES.CONE, "#6f9c82", [0, 2.5, 0], [0.6, 1.3, 0.6]);
      break;
    case "flowers":
      k.box("#8b6f55", [0, 0.08, 0], [1.9, 0.16, 0.9]);
      for (let i = 0; i < 10; i++)
        k.add(SHAPES.BALL, ["#e98aa0", "#f2cf5b", "#b49be0", "#f2f0e8"][i % 4], [-0.75 + (i % 5) * 0.37, 0.3, i < 5 ? -0.2 : 0.2], [0.14, 0.12, 0.14]);
      break;
    case "lantern":
      k.add(SHAPES.CYL6, "#4f5552", [0, 0.7, 0], [0.05, 1.4, 0.05]);
      glow.add(SHAPES.BALL, "#fff", [0, 1.5, 0], [0.18, 0.22, 0.18]);
      k.add(SHAPES.CONE4, "#4f5552", [0, 1.78, 0], [0.24, 0.22, 0.24]);
      break;
    case "bench":
      k.box("#9c7b58", [0, 0.45, 0], [1.6, 0.08, 0.45]);
      k.box("#9c7b58", [0, 0.78, -0.2], [1.6, 0.36, 0.06]);
      for (const x of [-0.7, 0.7]) k.box("#5d4a3a", [x, 0.22, 0], [0.08, 0.44, 0.4]);
      break;
    case "fence":
      for (const x of [-0.9, 0, 0.9]) k.box("#efe7d6", [x, 0.4, 0], [0.1, 0.8, 0.1]);
      for (const y of [0.3, 0.6]) k.box("#efe7d6", [0, y, 0], [2, 0.08, 0.05]);
      break;
    case "rocks":
      for (let i = 0; i < 5; i++)
        k.add(SHAPES.ROCK, i % 2 ? "#a7a392" : "#8f8b7c", [Math.cos(i * 1.3) * 0.55, 0.2, Math.sin(i * 1.3) * 0.5], [0.42 - i * 0.04, 0.35, 0.38]);
      k.add(SHAPES.BUSH, "#8fb17b", [0.1, 0.15, 0.1], [0.3, 0.2, 0.3]);
      break;
    case "mushrooms":
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2,
          s = 0.7 + (i % 3) * 0.25;
        k.add(SHAPES.CYL6, "#efe6d2", [Math.cos(a) * 0.7, 0.14 * s, Math.sin(a) * 0.7], [0.06 * s, 0.28 * s, 0.06 * s]);
        k.add(SHAPES.BALL, i % 2 ? "#c8645a" : "#c9a06a", [Math.cos(a) * 0.7, 0.3 * s, Math.sin(a) * 0.7], [0.2 * s, 0.11 * s, 0.2 * s]);
      }
      break;
    case "bunting":
      for (const x of [-1.4, 1.4]) k.add(SHAPES.CYL6, "#6d5847", [x, 1.1, 0], [0.05, 2.2, 0.05]);
      k.box("#d9c79f", [0, 2.05, 0], [2.8, 0.025, 0.025]);
      for (let i = 0; i < 8; i++)
        k.add(SHAPES.CONE4, ["#e4744f", "#f2c75e", "#5fa7bb", "#9bc27a"][i % 4], [-1.2 + i * 0.34, 1.85, 0], [0.13, -0.32, 0.03]);
      break;
    case "pond":
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        k.add(SHAPES.ROCK, i % 2 ? "#a7a392" : "#918d7e", [Math.cos(a) * 1.75, 0.08, Math.sin(a) * 1.25], [0.32, 0.2, 0.28]);
      }
      k.add(SHAPES.CYL, "#6fb0bf", [0, 0.04, 0], [1.75, 0.06, 1.25]);
      for (let i = 0; i < 3; i++) k.add(SHAPES.CYL, "#7fab69", [-0.6 + i * 0.6, 0.09, (i % 2) * 0.4 - 0.2], [0.24, 0.02, 0.24]);
      k.add(SHAPES.BALL, "#f1b6c6", [0, 0.14, 0.2], [0.09, 0.07, 0.09]);
      break;
    case "arch":
      for (const x of [-1.2, 1.2]) k.box("#efe7d6", [x, 1.1, 0], [0.14, 2.2, 0.14]);
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI;
        k.box("#efe7d6", [Math.cos(a) * 1.2, 2.2 + Math.sin(a) * 0.55, 0], [0.12, 0.12, 0.14]);
        k.add(SHAPES.BALL, i % 2 ? "#e98aa0" : "#7fab69", [Math.cos(a) * 1.2, 2.28 + Math.sin(a) * 0.55, 0.06], [0.18, 0.16, 0.18]);
      }
      break;
    case "windchime":
      k.add(SHAPES.CYL6, "#6d5847", [0, 1.1, 0], [0.05, 2.2, 0.05]);
      k.box("#6d5847", [0.25, 2.1, 0], [0.6, 0.05, 0.05]);
      for (let i = 0; i < 4; i++) k.add(SHAPES.CYL6, "#c7b77f", [0.05 + i * 0.13, 1.8, 0], [0.025, 0.4 + (i % 2) * 0.12, 0.025]);
      break;
    case "fountain":
      k.add(SHAPES.CYL, "#b8b2a2", [0, 0.25, 0], [1.4, 0.5, 1.4]);
      k.add(SHAPES.CYL, "#7fbccc", [0, 0.48, 0], [1.2, 0.06, 1.2]);
      k.add(SHAPES.CYL6, "#a9a396", [0, 0.95, 0], [0.18, 1, 0.18]);
      k.add(SHAPES.CYL, "#b8b2a2", [0, 1.45, 0], [0.6, 0.18, 0.6]);
      k.add(SHAPES.CYL, "#a8dbe2", [0, 1.56, 0], [0.48, 0.04, 0.48]);
      k.add(SHAPES.BALL, "#cfeef0", [0, 1.75, 0], [0.12, 0.25, 0.12]);
      break;
    case "statue":
      k.box("#b8b2a2", [0, 0.35, 0], [1.3, 0.7, 1.3]);
      k.add(SHAPES.BALL, "#cfc8b6", [0, 1.15, 0], [0.45, 0.42, 0.4]);
      k.add(SHAPES.BALL, "#cfc8b6", [0, 1.65, 0.12], [0.3, 0.28, 0.28]);
      for (const x of [-0.16, 0.16]) k.add(SHAPES.CONE, "#cfc8b6", [x, 2, 0.1], [0.09, 0.28, 0.09]);
      k.add(SHAPES.BALL, "#cfc8b6", [0, 0.95, -0.42], [0.12, 0.12, 0.3]);
      break;
  }
  return { solid: k.build(), glow: glow.build() };
}

// Habitats are 4×4 plots: element ground, a low fence open toward the front, and a feature at the back.
function habitatGeometry(element: string): Built {
  const k = new Kit(),
    glow = new Kit(),
    [ground, main, accent] = ELEMENT_COLORS[element] || ELEMENT_COLORS.Grove;
  k.box(ground, [0, 0.05, 0], [3.8, 0.1, 3.8]);
  for (let i = 0; i < 9; i++) {
    const t = -1.8 + i * 0.45;
    k.box("#8c6e52", [t, 0.32, -1.85], [0.08, 0.5, 0.08]);
    k.box("#8c6e52", [-1.85, 0.32, t], [0.08, 0.5, 0.08]);
    k.box("#8c6e52", [1.85, 0.32, t], [0.08, 0.5, 0.08]);
    if (Math.abs(t) > 0.8) k.box("#8c6e52", [t, 0.32, 1.85], [0.08, 0.5, 0.08]);
  }
  k.box("#a5876a", [0, 0.48, -1.85], [3.7, 0.06, 0.06]);
  for (const s of [-1, 1]) {
    k.box("#a5876a", [s * 1.85, 0.48, 0], [0.06, 0.06, 3.7]);
    k.box("#a5876a", [s * 1.35, 0.48, 1.85], [1, 0.06, 0.06]);
  }
  k.add(SHAPES.CYL6, "#6d5847", [1.6, 0.6, 2.05], [0.05, 1.2, 0.05]);
  k.box(main, [1.6, 1.15, 2.08], [0.6, 0.36, 0.06]);
  k.push([0, 0.1, -0.9]);
  switch (element) {
    case "Flame":
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.add(SHAPES.ROCK, "#8f8b7c", [Math.cos(a) * 0.7, 0.15, Math.sin(a) * 0.6], [0.24, 0.22, 0.22]);
      }
      glow.add(SHAPES.BALL, "#fff", [0, 0.2, 0], [0.45, 0.18, 0.4]);
      k.add(SHAPES.CONE, main, [0, 0.55, 0], [0.32, 0.7, 0.32]);
      k.add(SHAPES.CONE, accent, [0.18, 0.45, 0.1], [0.18, 0.45, 0.18]);
      break;
    case "Tide":
      k.add(SHAPES.CYL, main, [0, 0.02, 0.1], [1.3, 0.04, 0.85]);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.add(SHAPES.ROCK, "#a7a392", [Math.cos(a) * 1.35, 0.1, 0.1 + Math.sin(a) * 0.9], [0.24, 0.18, 0.22]);
      }
      k.add(SHAPES.CONE, accent, [0.6, 0.2, -0.3], [0.16, 0.36, 0.16], [0.5, 0, 0]);
      break;
    case "Grove":
      k.add(SHAPES.CYL6, "#7a6650", [-0.7, 0.6, 0], [0.12, 1.2, 0.12]);
      k.add(SHAPES.BUSH, main, [-0.7, 1.5, 0], [0.7, 0.6, 0.7]);
      for (const x of [0.4, 1]) k.add(SHAPES.BUSH, accent, [x, 0.25, 0.1], [0.38, 0.3, 0.38]);
      break;
    case "Stone":
      k.add(SHAPES.ROCK, main, [-0.6, 0.45, 0], [0.6, 0.6, 0.55]);
      k.add(SHAPES.ROCK, accent, [0.5, 0.35, 0.1], [0.5, 0.45, 0.45]);
      k.box(main, [0, 1.05, 0], [1.6, 0.25, 0.45]);
      break;
    case "Storm":
      k.add(SHAPES.CYL6, "#6d6a60", [0, 0.9, 0], [0.08, 1.8, 0.08]);
      glow.add(SHAPES.BALL, "#fff", [0, 1.95, 0], [0.18, 0.3, 0.18]);
      k.add(SHAPES.BUSH, accent, [0, 2.6, 0], [0.75, 0.32, 0.5]);
      k.box("#8c6e52", [0, 1.2, 0], [1.2, 0.07, 0.07]);
      break;
    case "Frost":
      for (let i = 0; i < 5; i++)
        k.add(SHAPES.CONE4, i % 2 ? main : accent, [-0.8 + i * 0.4, 0.4 + (i % 2) * 0.2, (i % 3) * 0.15], [0.18, 0.8 + (i % 2) * 0.4, 0.18]);
      k.add(SHAPES.CYL, accent, [0, 0.02, 0.4], [1.2, 0.04, 0.6]);
      break;
    case "Light":
      k.box("#efe4cc", [0, 0.5, 0], [0.9, 0.9, 0.7]);
      k.add(SHAPES.GABLE, main, [0, 0.95, 0], [1.1, 0.5, 0.9]);
      glow.add(SHAPES.CYL, "#fff", [0, 0.55, 0.36], [0.22, 0.04, 0.22], [Math.PI / 2, 0, 0]);
      break;
    case "Shadow":
      for (let i = 0; i < 4; i++) k.add(SHAPES.ROCK, "#5f5870", [-0.9 + i * 0.6, 0.3, (i % 2) * 0.2], [0.3, 0.45, 0.3]);
      k.add(SHAPES.CONE4, main, [0, 0.6, 0], [0.24, 1.1, 0.24]);
      glow.add(SHAPES.BALL, "#fff", [0.7, 1.7, 0], [0.24, 0.24, 0.24]);
      break;
  }
  k.pop();
  return { solid: k.build(), glow: glow.build() };
}
const cache = new Map<string, Built>();
function geometryFor(entry: CatalogEntry) {
  let built = cache.get(entry.kind);
  if (!built) {
    built = entry.type === "habitat" ? habitatGeometry(entry.element!) : decorGeometry(entry.kind);
    cache.set(entry.kind, built);
  }
  return built;
}

/** Grass and flower tufts around the rim; purely decorative and never in the way. */
function RimTufts({ radius }: { radius: number }) {
  const mesh = useMemo(() => {
    const count = Math.round(radius * (settings.quality === "Low" ? 4 : 9)),
      m = new T.InstancedMesh(
        new T.ConeGeometry(1, 1, 3),
        new T.MeshStandardMaterial({ flatShading: true, roughness: 1 }),
        count,
      ),
      o = new T.Object3D(),
      c = new T.Color();
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996 + Math.sin(i * 7.1) * 0.2,
        r = radius - 0.25 - ((i * 0.618) % 1) * 1.3;
      o.position.set(Math.cos(a) * r, 0.14, Math.sin(a) * r);
      o.rotation.set(0, i, 0);
      const flower = i % 7 === 0;
      o.scale.set(flower ? 0.09 : 0.14, flower ? 0.18 : 0.3, flower ? 0.09 : 0.14);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      c.set(flower ? ["#e98aa0", "#f2cf5b", "#f2f0e8"][i % 3] : ["#aec391", "#9cbb84", "#8daa78"][i % 3]);
      m.setColorAt(i, c);
    }
    m.name = "home-rim-tufts";
    m.receiveShadow = true;
    return m;
  }, [radius]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}
function IslandGround({ radius, next }: { radius: number; next?: number }) {
  return (
    <group name="home-ground">
      <RimTufts radius={radius} />
      <mesh name="home-turf" receiveShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[radius, radius * 0.96, 1, 72]} />
        <meshStandardMaterial color="#8fb487" roughness={1} />
      </mesh>
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.86, 0.6, 28]} />
        <meshStandardMaterial color="#9b8467" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -1.55 - radius * 0.35, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius * 0.86, radius * 0.7, 13]} />
        <meshStandardMaterial color="#7d7a6c" flatShading roughness={1} />
      </mesh>
      {/* The walkway from the dock to the porch. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-(HOUSE_YARD + radius) / 2, 0.012, 0]}>
        <planeGeometry args={[radius - HOUSE_YARD, 2]} />
        <meshStandardMaterial color="#d9c79a" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[HOUSE_YARD * 2, HOUSE_YARD * 2]} />
        <meshStandardMaterial color="#c8c39a" roughness={1} />
      </mesh>
      {next && (
        <mesh name="home-next-land" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[radius, next, 96]} />
          <meshBasicMaterial color="#f4f1e6" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
function House({ level, onInteract, disabled }: { level: number; onInteract: (id: string) => void; disabled: boolean }) {
  const built = useMemo(() => houseGeometry(level), [level]);
  useEffect(() => () => [built.solid, built.glow].forEach((g) => g.dispose()), [built]);
  return (
    <WorldInteraction
      name="home-house"
      title="Your house"
      hint="Build, decorate and upgrade"
      disabled={disabled}
      activate={() => onInteract("home-house")}
      approach={[-(houseHalf({ house: level } as HomeState) + 1.4), 0]}
    >
      {/* The door faces west, toward the dock walkway. */}
      <group rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
        <mesh geometry={built.glow} material={lampGlow} />
        <ChimneySmoke points={built.smoke.map((v) => v.clone().applyAxisAngle(UP, -Math.PI / 2))} />
      </group>
    </WorldInteraction>
  );
}
function Placed({ item }: { item: HomeItem }) {
  const entry = catalogEntry(item.kind);
  if (!entry) return null;
  const built = geometryFor(entry);
  return (
    <group name={`home-item-${item.uid}`} position={[item.x, 0, item.z]} rotation={[0, (-item.rot * Math.PI) / 2, 0]}>
      <mesh geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh geometry={built.glow} material={lampGlow} />
    </group>
  );
}
/** A companion living in a habitat: it wanders the front of the plot and can be greeted. */
function HabitatResident({
  species,
  item,
  index,
  onGreet,
  disabled,
  title,
}: {
  species: string;
  item: HomeItem;
  index: number;
  onGreet: () => void;
  disabled: boolean;
  title: string;
}) {
  const model = useMemo(() => createCreature(species), [species]),
    time = useRef(index * 4.1),
    cheer = useRef(0);
  const angle = (-item.rot * Math.PI) / 2,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  useEffect(() => {
    model.scale.setScalar(0.72);
  }, [model]);
  useFrame((_s, dt) => {
    time.current += Math.min(dt, 0.05);
    cheer.current = Math.max(0, cheer.current - dt);
    const t = time.current,
      walking = !settings.reduced && cheer.current <= 0 && t % 10 < 6;
    if (walking) {
      // Local wander in the open front half of the plot, rotated with the habitat.
      const lx = Math.sin(t * 0.31 + index * 2) * 1.2,
        lz = 0.55 + Math.cos(t * 0.23 + index) * 0.75;
      const x = item.x + lx * cos + lz * sin,
        z = item.z - lx * sin + lz * cos;
      const dx = x - model.position.x,
        dz = z - model.position.z;
      if (Math.hypot(dx, dz) > 0.001) model.rotation.y = Math.atan2(dx, dz);
      model.position.set(x, 0.1, z);
    } else if (!model.position.lengthSq()) {
      model.position.set(item.x + (index - 1) * 0.9 * cos, 0.1, item.z - (index - 1) * 0.9 * sin);
    }
    animateCreature(model, t, cheer.current > 0 ? "victory" : walking ? "walk" : "idle", 0, settings.reduced);
  });
  return (
    <WorldInteraction
      name={`home-resident-${species}-${index}`}
      title={title}
      hint="Lives here · Click to greet"
      disabled={disabled}
      reach={4}
      activate={() => {
        cheer.current = 1.6;
        audio.voice(species);
        onGreet();
      }}
    >
      <primitive object={model} />
    </WorldInteraction>
  );
}
function Habitat({
  item,
  home,
  profile,
  onInteract,
  disabled,
}: {
  item: HomeItem;
  home: HomeState;
  profile: Profile;
  onInteract: (id: string) => void;
  disabled: boolean;
}) {
  const entry = catalogEntry(item.kind)!;
  const residents = (home.residents[item.uid] || [])
    .map((id) => profile.owned.find((o) => o.id === id))
    .filter((o) => !!o);
  const stored = habitatStored(profile, home, item);
  return (
    <group>
      <WorldInteraction
        name={`home-habitat-${item.uid}`}
        title={entry.name}
        hint={`${residents.length} living here · Click to manage`}
        disabled={disabled}
        activate={() => onInteract(`habitat-${item.uid}`)}
      >
        <Placed item={item} />
      </WorldInteraction>
      {residents.map((o, i) => (
        <HabitatResident
          key={o.id}
          species={o.species}
          item={item}
          index={i}
          disabled={disabled}
          title={o.nickname || byId[o.species]?.name || "Companion"}
          onGreet={() => onInteract(`pet-${o.id}`)}
        />
      ))}
      {!disabled && (
        <Html position={[item.x, 2.3, item.z]} center zIndexRange={[2, 0]} style={{ pointerEvents: "auto" }}>
          <button className="world-label habitat-label" data-marker={`habitat-${item.uid}`} onClick={() => onInteract(`habitat-${item.uid}`)}>
            <span>⌂</span>
            {entry.name}
            {stored > 0 && <b> · {stored} Gold</b>}
          </button>
        </Html>
      )}
    </group>
  );
}
const ghostOk = new T.MeshBasicMaterial({ color: "#9fe6a7", transparent: true, opacity: 0.55, depthWrite: false }),
  ghostBad = new T.MeshBasicMaterial({ color: "#f08f80", transparent: true, opacity: 0.55, depthWrite: false });
/** Follows the pointer while placing; a click confirms the spot. */
function PlacementGhost({ home, placing, onPlace }: { home: HomeState; placing: Placing; onPlace: (x: number, z: number) => void }) {
  const entry = catalogEntry(placing.kind)!;
  const built = geometryFor(entry);
  const [spot, setSpot] = useState<[number, number] | null>(null);
  const problem = spot ? placementError(home, entry, spot[0], spot[1], placing.rot, placing.uid) : "Point at your land";
  const snap = (v: number) => Math.round(v * 2) / 2;
  return (
    <>
      <mesh
        name="home-placement-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setSpot([snap(e.point.x), snap(e.point.z)]);
        }}
        onClick={(e) => {
          if (e.delta >= 6) return;
          e.stopPropagation();
          const x = snap(e.point.x),
            z = snap(e.point.z);
          setSpot([x, z]);
          if (!placementError(home, entry, x, z, placing.rot, placing.uid)) onPlace(x, z);
          else audio.cue("error");
        }}
      >
        <planeGeometry args={[90, 90]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {spot && (
        <group name="home-ghost" position={[spot[0], 0.02, spot[1]]} rotation={[0, (-placing.rot * Math.PI) / 2, 0]}>
          <mesh geometry={built.solid} material={problem ? ghostBad : ghostOk} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={problem ? ghostBad : ghostOk}>
            <planeGeometry args={[entry.w, entry.d]} />
          </mesh>
          <Html position={[0, 2.6, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: "none" }}>
            <span className={`placement-tip ${problem ? "bad" : ""}`}>{problem || "Click to place"}</span>
          </Html>
        </group>
      )}
    </>
  );
}

/** Named points on the Home island, for the HUD, minimap and touch prompts. */
export function homeInteractables(home: HomeState) {
  const r = homeRadius(home);
  return [
    { id: "home-ferry", name: "Skyferry", hint: "Sail back to Havenreach", p: [islandDock(r)[0], 0, 0] },
    { id: "home-house", name: "Your house", hint: "Build, decorate and upgrade", p: [-(houseHalf(home) + 1.2), 0, 0] },
    ...home.items
      .filter((i) => catalogEntry(i.kind)?.type === "habitat")
      .map((i) => ({ id: `habitat-${i.uid}`, name: catalogEntry(i.kind)!.name, hint: "Manage habitat", p: [i.x, 0, i.z] })),
  ];
}
/** Walk area for the Home island; the key changes with its layout so paths are replanned. */
export function homeArea(home: HomeState): WalkArea {
  const r = homeRadius(home);
  return {
    key: `home:${home.expansion}:${home.house}:${home.items.map((i) => `${i.uid}@${i.x},${i.z},${i.rot}`).join(";")}`,
    allowed: (x, z) => homeWalkable(home, x, z),
    extent: r + 2,
    home: islandArrival("home", r),
    points: homeInteractables(home),
  };
}
export function IslandScene({
  profile,
  blocked,
  onNear,
  onInteract,
  onPosition,
  pet,
  input,
  placing,
  onPlace,
}: {
  profile: Profile;
  blocked: boolean;
  onNear: (s: string) => void;
  onInteract: (s: string) => void;
  onPosition: (x: number, z: number) => void;
  pet: boolean;
  input: MutableRefObject<ExplorationInput>;
  placing: Placing | null;
  onPlace: (x: number, z: number) => void;
}) {
  const home = profile.home || defaultHome(),
    r = homeRadius(home),
    next = HOME_EXPANSIONS[home.expansion + 1]?.radius;
  const area = useMemo(() => homeArea(home), [home]);
  const spawn = useMemo(() => islandArrival("home", r), []);
  const walker = useRef<Walker>({ go: (_t, _r, act) => act?.() });
  const shown = home.items.filter((i) => i.uid !== placing?.uid);
  return (
    <Canvas
      shadows
      camera={{ position: [spawn[0] + 10, 10, spawn[1] + 11], fov: 45 }}
      frameloop={blocked ? "demand" : "always"}
      dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
    >
      <WalkContext.Provider value={walker}>
        <color attach="background" args={["#9fc3c4"]} />
        <fog attach="fog" args={["#b4cfca", 30, 95]} />
        <ModelLighting intensity={0.35} />
        <DayNight sky="#9fc3c4" fog="#b4cfca" haven={false} />
        <SkyLife radius={r + 16} />
        <WeatherEffects region="haven" />
        <IslandGround radius={r} next={next} />
        <House level={home.house} onInteract={onInteract} disabled={blocked || !!placing} />
        {shown.map((item) =>
          catalogEntry(item.kind)?.type === "habitat" ? (
            <Habitat key={item.uid} item={item} home={home} profile={profile} onInteract={onInteract} disabled={blocked || !!placing} />
          ) : (
            <Placed key={item.uid} item={item} />
          ),
        )}
        <WorldInteraction
          name="interactable-home-ferry"
          position={[islandDock(r)[0], 0, 0]}
          title="Skyferry"
          hint="Sail back to Havenreach"
          disabled={blocked || !!placing}
          activate={() => onInteract("home-ferry")}
        >
          <SkyferryDock position={[0, 0, 0]} heading={-Math.PI / 2} />
          {!blocked && !placing && (
            <Html position={[0, 3.4, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: "auto" }}>
              <button className="world-label" data-marker="home-ferry" onClick={() => walker.current.go(islandDock(r), 5.5, () => onInteract("home-ferry"))}>
                <span>⛵</span>Skyferry
              </button>
            </Html>
          )}
        </WorldInteraction>
        {placing && <PlacementGhost home={home} placing={placing} onPlace={onPlace} />}
        <Explorer
          key="home"
          spawn={spawn}
          area={area}
          {...{ profile, blocked, onNear, onInteract, onPosition, pet, input }}
          walker={walker}
        />
      </WalkContext.Provider>
    </Canvas>
  );
}

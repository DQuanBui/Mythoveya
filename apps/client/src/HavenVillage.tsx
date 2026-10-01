import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  COTTAGE_SIZE,
  HAVEN_CAMPFIRE,
  HAVEN_COTTAGES,
  HAVEN_DOCK,
  HAVEN_HOUSES,
  HAVEN_LAMPS,
  HAVEN_WELL,
  HAVEN_WINDMILL,
  facePath,
} from "../../../packages/shared/haven";
import { Kit, SHAPES } from "./village-kit";
import { lampGlow, villageGlow } from "./village-materials";
import { settings } from "./audio";

const TIMBER = "#6d5847",
  TIMBER_DARK = "#584737",
  DOOR = "#7a5a44",
  FRAME = "#efe4c7",
  GLASS = "#f6dc9c",
  STONE = "#aaa591",
  FENCE = "#c1ad87",
  PLANTER = "#93694c",
  IRON = "#4f5552",
  FLOWERS = ["#e7a9a0", "#f0d48a", "#b9a7d8", "#f4efe2"];
const TAPER = new T.CylinderGeometry(0.75, 1, 1, 8);

export const villageMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.9,
});

function windowAt(
  k: Kit,
  g: Kit,
  at: [number, number, number],
  rotationY: number,
  shutter: string | null,
  flowers = true,
) {
  k.push(at, rotationY);
  k.box(FRAME, [0, 0, 0], [0.72, 0.78, 0.06]);
  g.push(at, rotationY).box(GLASS, [0, 0, 0.04], [0.56, 0.62, 0.02]).pop();
  k.box(FRAME, [0, 0, 0.06], [0.05, 0.62, 0.03]);
  k.box(FRAME, [0, 0, 0.06], [0.56, 0.05, 0.03]);
  if (shutter)
    for (const s of [-1, 1]) k.box(shutter, [s * 0.47, 0, 0.03], [0.2, 0.72, 0.05]);
  if (flowers) {
    k.box(PLANTER, [0, -0.47, 0.13], [0.74, 0.17, 0.24]);
    for (let i = 0; i < 3; i++)
      k.add(SHAPES.BALL, FLOWERS[(i + Math.round(at[0] * 3)) & 3], [-0.22 + i * 0.22, -0.33, 0.15], [0.11, 0.11, 0.11]);
  }
  k.pop();
}
function fenceLine(k: Kit, from: [number, number], to: [number, number]) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]),
    posts = Math.max(2, Math.round(length / 0.75) + 1),
    angle = Math.atan2(to[0] - from[0], to[1] - from[1]);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    k.box(FENCE, [from[0] + (to[0] - from[0]) * t, 0.36, from[1] + (to[1] - from[1]) * t], [0.1, 0.72, 0.1]);
  }
  for (const y of [0.3, 0.58])
    k.box(FENCE, [(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2], [0.05, 0.07, length], [0, angle, 0]);
}
function cottage(
  k: Kit,
  g: Kit,
  c: (typeof HAVEN_COTTAGES)[number],
  i: number,
  chimneys: T.Vector3[],
) {
  const { w, d } = COTTAGE_SIZE[c.style],
    tall = c.style === "tall",
    long = c.style === "long",
    base = 0.3,
    h = tall ? 3.5 : 2.3,
    top = base + h,
    rise = tall ? 1.5 : 1.35,
    ridge = top + rise,
    half = d / 2 + 0.38,
    drop = (rise * half) / (d / 2),
    angle = Math.atan2(rise, d / 2);
  k.push([c.point[0], 0, c.point[1]], c.rotation);
  g.push([c.point[0], 0, c.point[1]], c.rotation);
  k.box(STONE, [0, base / 2, 0], [w + 0.3, base, d + 0.3]);
  k.box(c.wall, [0, base + h / 2, 0], [w, h, d]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      k.box(TIMBER, [(sx * w) / 2, base + h / 2, (sz * d) / 2], [0.17, h, 0.17]);
  for (const sz of [-1, 1]) {
    k.box(TIMBER, [0, top - 0.07, sz * (d / 2 + 0.01)], [w + 0.06, 0.14, 0.07]);
    if (tall)
      k.box(TIMBER, [0, base + 1.85, sz * (d / 2 + 0.01)], [w + 0.06, 0.12, 0.07]);
  }
  k.add(SHAPES.GABLE, c.wall, [0, top, 0], [w, rise, d]);
  for (const s of [-1, 1])
    k.box(
      c.roof,
      [0, ridge - drop / 2 + 0.09, (s * half) / 2],
      [w + 0.6, 0.16, Math.hypot(half, drop) + 0.06],
      [s * angle, 0, 0],
    );
  k.box(TIMBER_DARK, [0, ridge + 0.1, 0], [w + 0.7, 0.15, 0.17]);
  // Chimney
  const cx = w * 0.26 * (i % 2 ? -1 : 1),
    cz = -d * 0.2;
  k.box("#9c9281", [cx, (top + ridge + 0.6) / 2, cz], [0.46, ridge + 0.6 - top, 0.46]);
  k.box("#857c6d", [cx, ridge + 0.62, cz], [0.56, 0.1, 0.56]);
  chimneys.push(k.point([cx, ridge + 0.7, cz]));
  // Front door, step, awning, lantern
  const doorX = long ? -1 : 0,
    front = d / 2;
  k.box(TIMBER_DARK, [doorX, base + 0.8, front + 0.02], [0.95, 1.62, 0.06]);
  k.box(DOOR, [doorX, base + 0.74, front + 0.05], [0.72, 1.46, 0.06]);
  k.box(TIMBER_DARK, [doorX, base + 0.74, front + 0.09], [0.06, 1.3, 0.03]);
  g.box("#f4d99a", [doorX + 0.24, base + 0.72, front + 0.1], [0.07, 0.07, 0.05]);
  k.box(STONE, [doorX, 0.1, front + 0.42], [1.2, 0.2, 0.6]);
  k.box(c.roof, [doorX, base + 1.82, front + 0.3], [1.35, 0.08, 0.7], [0.32, 0, 0]);
  k.box(TIMBER_DARK, [doorX + 0.72, base + 1.62, front + 0.14], [0.26, 0.06, 0.26]);
  g.box("#ffe2a0", [doorX + 0.72, base + 1.47, front + 0.14], [0.18, 0.24, 0.18]);
  // Windows
  const ground = base + (tall ? 1.1 : 1.25);
  const fronts = long ? [0.4, 1.45] : tall ? [-0.95, 0.95] : [-0.98, 0.98];
  for (const x of fronts)
    windowAt(k, g, [x, ground, front + 0.03], 0, tall ? null : c.shutter);
  if (tall)
    for (const x of [-0.7, 0.7])
      windowAt(k, g, [x, base + 2.7, front + 0.03], 0, c.shutter);
  windowAt(k, g, [0, ground, -front - 0.03], Math.PI, c.shutter, false);
  for (const s of [-1, 1])
    windowAt(k, g, [(s * w) / 2 + s * 0.03, ground, 0], (s * Math.PI) / 2, c.shutter, i % 2 === 0);
  // Yard: fences behind and beside, with a woodpile or barrel and crates.
  const fx = w / 2 + 0.45,
    back = -front - 0.55;
  fenceLine(k, [-fx, back], [fx, back]);
  fenceLine(k, [-fx, back], [-fx, front - 0.35]);
  fenceLine(k, [fx, back], [fx, front - 0.35]);
  for (let l = 0; l < 3; l++)
    k.add(SHAPES.CYL6, "#8a6a4a", [-w * 0.2 + l * 0.05, 0.13 + l * 0.2, back + 0.25], [0.12, w * 0.5, 0.12], [0, 0, Math.PI / 2]);
  k.add(SHAPES.CYL, "#8b6a4a", [w / 2 + 0.2, 0.3, front + 0.38], [0.26, 0.6, 0.26]);
  for (const y of [0.12, 0.48])
    k.add(SHAPES.CYL, "#5d554c", [w / 2 + 0.2, y, front + 0.38], [0.27, 0.05, 0.27]);
  k.box("#b79a6f", [-w / 2 - 0.15, 0.23, front + 0.4], [0.45, 0.45, 0.45], [0, 0.2, 0]);
  if (i % 3 !== 1)
    k.box("#a98d63", [-w / 2 - 0.12, 0.6, front + 0.42], [0.3, 0.3, 0.3], [0, -0.3, 0]);
  else
    for (let f = 0; f < 4; f++)
      k.add(SHAPES.BUSH, ["#8fae7f", "#a1bb88"][f % 2], [-w / 2 + 0.3 + f * 0.6, 0.22, front + 0.35], [0.28, 0.24, 0.24]);
  k.pop();
  g.pop();
}
function windmill(k: Kit, g: Kit) {
  const [x, z] = HAVEN_WINDMILL.point,
    rotation = facePath(x, z),
    radius = (y: number) => 1.35 - ((y - 0.5) / 5.2) * 0.34;
  k.push([x, 0, z], rotation);
  g.push([x, 0, z], rotation);
  k.add(SHAPES.CYL, STONE, [0, 0.25, 0], [1.75, 0.5, 1.75]);
  k.add(TAPER, "#e6dccb", [0, 3.1, 0], [1.35, 5.2, 1.35], [0, Math.PI / 8, 0]);
  for (const y of [2.2, 4.3])
    k.add(SHAPES.CYL, TIMBER, [0, y, 0], [radius(y) + 0.04, 0.13, radius(y) + 0.04], [0, Math.PI / 8, 0]);
  k.add(SHAPES.CONE, "#9a6250", [0, 6.42, 0], [1.38, 1.45, 1.38], [0, Math.PI / 8, 0]);
  const face = (y: number) => radius(y) * Math.cos(Math.PI / 8);
  k.box(TIMBER_DARK, [0, 1.25, face(1.25) + 0.02], [0.92, 1.55, 0.08]);
  k.box(DOOR, [0, 1.2, face(1.2) + 0.06], [0.7, 1.4, 0.06]);
  for (const [wx, wy] of [
    [0, 3.4],
  ] as const) {
    k.box(FRAME, [wx, wy, face(wy) + 0.02], [0.6, 0.7, 0.06]);
    g.box(GLASS, [wx, wy, face(wy) + 0.06], [0.44, 0.54, 0.02]);
  }
  for (const s of [-1, 1]) {
    k.push([0, 0, 0], (s * Math.PI) / 2);
    k.box(FRAME, [0, 2.8, face(2.8) + 0.02], [0.6, 0.7, 0.06]);
    k.pop();
    g.push([0, 0, 0], (s * Math.PI) / 2).box(GLASS, [0, 2.8, face(2.8) + 0.06], [0.44, 0.54, 0.02]).pop();
  }
  k.add(SHAPES.CYL, TIMBER_DARK, [0, 5.1, 1.25], [0.13, 0.75, 0.13], [Math.PI / 2, 0, 0]);
  for (let s = 0; s < 4; s++)
    k.add(SHAPES.ROCK, "#9c9a88", [Math.cos(s * 1.7) * 1.95, 0.12, Math.sin(s * 1.7) * 1.95], [0.25, 0.18, 0.22]);
  k.pop();
  g.pop();
}
function sailGeometry() {
  const k = new Kit();
  k.add(SHAPES.CYL, TIMBER_DARK, [0, 0, 0], [0.28, 0.3, 0.28], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2,
      along: [number, number] = [-Math.sin(a), Math.cos(a)],
      side: [number, number] = [Math.cos(a), Math.sin(a)];
    k.box(TIMBER, [along[0] * 1.9, along[1] * 1.9, 0], [0.13, 3.6, 0.09], [0, 0, a]);
    k.box("#efe7d3", [along[0] * 2.15 + side[0] * 0.5, along[1] * 2.15 + side[1] * 0.5, 0.03], [0.8, 2.7, 0.04], [0, 0, a]);
    for (const o of [1.4, 2.3, 3.2])
      k.box(TIMBER, [along[0] * o + side[0] * 0.5, along[1] * o + side[1] * 0.5, 0.06], [0.82, 0.05, 0.05], [0, 0, a]);
  }
  return k.build();
}
function well(k: Kit) {
  const [x, z] = HAVEN_WELL.point,
    a = Math.atan2(0.5, 0.75);
  k.push([x, 0, z], facePath(x, z));
  k.add(SHAPES.CYL, STONE, [0, 0.4, 0], [0.95, 0.8, 0.95]);
  k.add(SHAPES.CYL, "#4b7c84", [0, 0.81, 0], [0.74, 0.02, 0.74]);
  for (let s = 0; s < 10; s++)
    k.add(SHAPES.ROCK, s % 2 ? "#bdb6a2" : "#9f9a88", [Math.cos(s * 0.63) * 0.95, 0.45 + (s % 3) * 0.12, Math.sin(s * 0.63) * 0.95], [0.16, 0.12, 0.14]);
  for (const s of [-1, 1]) k.box(TIMBER, [s * 0.85, 1.3, 0], [0.14, 1.8, 0.14]);
  for (const s of [-1, 1])
    k.box("#8e6457", [0, 2.32, s * 0.37], [2.2, 0.1, Math.hypot(0.75, 0.5) + 0.05], [s * a, 0, 0]);
  k.add(SHAPES.CYL, TIMBER_DARK, [0, 1.75, 0], [0.07, 1.75, 0.07], [0, 0, Math.PI / 2]);
  k.box("#d8c8a0", [0, 1.4, 0], [0.03, 0.7, 0.03]);
  k.add(SHAPES.CYL, "#8b6a4a", [0, 0.98, 0], [0.16, 0.24, 0.16]);
  k.pop();
}
function dock(k: Kit, g: Kit) {
  const d = HAVEN_DOCK;
  for (let z = d.z1 - 0.2, i = 0; z > d.z0; z -= 0.43, i++)
    k.box(i % 3 ? "#b49c78" : "#a68f6c", [d.x, 0.13, z], [1.7, 0.08, 0.39]);
  for (const s of [-1, 1]) {
    k.box(TIMBER, [d.x + s * 0.8, 0.06, (d.z0 + d.z1) / 2], [0.12, 0.12, d.z1 - d.z0]);
    for (const z of [d.z1 - 0.2, 0.2, d.z0 + 0.15])
      k.add(SHAPES.CYL6, TIMBER_DARK, [d.x + s * 0.82, -0.1, z], [0.09, 0.95, 0.09]);
  }
  k.add(SHAPES.CYL, "#8f7556", [d.x + 0.5, 0.33, d.z0 + 0.45], [0.2, 0.32, 0.2]);
  k.add(SHAPES.CYL, "#6b7f84", [d.x + 0.5, 0.48, d.z0 + 0.45], [0.17, 0.02, 0.17]);
  k.box(TIMBER_DARK, [d.x - 0.55, 0.75, d.z0 + 0.4], [0.04, 1.3, 0.04], [0.55, 0, -0.25]);
  k.add(SHAPES.CYL6, TIMBER_DARK, [d.x - 0.8, 1, d.z1 - 0.05], [0.06, 2, 0.06]);
  k.box(IRON, [d.x - 0.8, 2.02, d.z1 - 0.05], [0.26, 0.06, 0.26]);
  g.box("#ffe2a0", [d.x - 0.8, 1.86, d.z1 - 0.05], [0.18, 0.26, 0.18]);
}
function boatGeometry() {
  const k = new Kit();
  k.box("#80624a", [0, 0.06, 0], [0.82, 0.12, 2.1]);
  for (const s of [-1, 1]) {
    k.box("#9c7a55", [s * 0.44, 0.22, 0], [0.08, 0.32, 1.9]);
    k.box("#9c7a55", [0, 0.22, s * 0.98], [0.86, 0.32, 0.08]);
  }
  k.add(SHAPES.GABLE, "#9c7a55", [0, 0.06, 1.12], [0.32, 0.38, 0.86], [Math.PI / 2, Math.PI / 2, 0]);
  k.box("#b39066", [0, 0.3, 0.2], [0.82, 0.06, 0.3]);
  for (const s of [-1, 1])
    k.box(TIMBER, [s * 0.3, 0.36, -0.25], [0.05, 0.05, 1.8], [0, s * 0.18, 0]);
  return k.build();
}
function campfire(k: Kit) {
  const [x, z] = HAVEN_CAMPFIRE.point;
  k.push([x, 0, z]);
  for (let s = 0; s < 9; s++) {
    const a = (s / 9) * Math.PI * 2;
    k.add(SHAPES.ROCK, s % 2 ? "#9d9a8c" : "#878478", [Math.cos(a) * 0.58, 0.1, Math.sin(a) * 0.58], [0.17, 0.13, 0.15]);
  }
  for (let l = 0; l < 3; l++)
    k.push([0, 0, 0], (l * Math.PI) / 3).add(SHAPES.CYL6, "#5e4632", [0, 0.12, 0], [0.07, 0.85, 0.07], [Math.PI / 2, 0, 0.25]).pop();
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * Math.PI * 2 + 0.4;
    k.push([Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25], -a - Math.PI / 2);
    k.add(SHAPES.CYL, "#7b5d42", [0, 0.2, 0], [0.19, 1.05, 0.19], [0, 0, Math.PI / 2]);
    k.pop();
  }
  k.pop();
}
function lamps(k: Kit, glow: Kit) {
  for (const [x, z] of HAVEN_LAMPS) {
    k.push([x, 0, z], facePath(x, z));
    glow.push([x, 0, z], facePath(x, z));
    k.add(SHAPES.CYL6, "#8f8a7c", [0, 0.12, 0], [0.18, 0.24, 0.18]);
    k.add(SHAPES.CYL6, IRON, [0, 1.3, 0], [0.055, 2.35, 0.055]);
    k.box(IRON, [0, 2.4, 0.25], [0.05, 0.05, 0.6]);
    k.add(SHAPES.CONE4, IRON, [0, 2.37, 0.5], [0.18, 0.16, 0.18], [0, Math.PI / 4, 0]);
    k.box(IRON, [0, 2.0, 0.5], [0.2, 0.04, 0.2]);
    glow.box("#ffe9b3", [0, 2.15, 0.5], [0.17, 0.26, 0.17]);
    k.pop();
    glow.pop();
  }
}
function bunting(k: Kit) {
  // Festival flags strung across the village lane.
  const from = new T.Vector3(-3, 2.3, 8.9),
    to = new T.Vector3(3, 2.3, 8.6),
    colors = ["#e2a68f", "#efd58f", "#8fbfb0", "#b7a6d6"];
  for (const s of [-1, 1])
    k.add(SHAPES.CYL6, TIMBER, [s * 3.1, 1.2, s < 0 ? 8.9 : 8.6], [0.06, 2.4, 0.06]);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12,
      p = from.clone().lerp(to, t);
    p.y -= Math.sin(t * Math.PI) * 0.35;
    if (i < 12) {
      const q = from.clone().lerp(to, (i + 1) / 12);
      q.y -= Math.sin(((i + 1) / 12) * Math.PI) * 0.35;
      const mid = p.clone().add(q).multiplyScalar(0.5);
      k.box("#e9dfc6", [mid.x, mid.y, mid.z], [p.distanceTo(q) + 0.02, 0.025, 0.025], [0, 0.05, Math.atan2(q.y - p.y, q.x - p.x)]);
      k.add(SHAPES.GABLE, colors[i % 4], [mid.x, mid.y - 0.01, mid.z], [0.03, 0.34, 0.3], [0, Math.PI / 2, Math.PI]);
    }
  }
}

export function HavenVillage() {
  const built = useMemo(() => {
    const k = new Kit(),
      g = new Kit(),
      lampKit = new Kit(),
      chimneys: T.Vector3[] = [];
    HAVEN_COTTAGES.forEach((c, i) => cottage(k, g, c, i, chimneys));
    windmill(k, g);
    well(k);
    dock(k, g);
    campfire(k);
    lamps(k, lampKit);
    bunting(k);
    for (const h of HAVEN_HOUSES)
      chimneys.push(new T.Vector3(h.point[0] + 1, 3.98, h.point[1] - 0.6));
    return {
      solid: k.build(),
      glow: g.build(),
      lamps: lampKit.build(),
      sails: sailGeometry(),
      boat: boatGeometry(),
      chimneys,
    };
  }, []);
  useEffect(
    () => () => {
      for (const geo of [built.solid, built.glow, built.lamps, built.sails, built.boat])
        geo.dispose();
    },
    [built],
  );
  const sails = useRef<T.Mesh>(null),
    boat = useRef<T.Mesh>(null);
  const [mx, mz] = HAVEN_WINDMILL.point;
  useFrame(({ clock }, dt) => {
    if (settings.reduced) return;
    if (sails.current) sails.current.rotation.z -= Math.min(dt, 0.05) * 0.55;
    if (boat.current) {
      boat.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 1.3) * 0.035;
      boat.current.rotation.z = Math.sin(clock.elapsedTime * 1.1) * 0.035;
    }
  });
  return (
    <group name="haven-village">
      <mesh name="village-buildings" geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh name="village-windows" geometry={built.glow} material={villageGlow} />
      <mesh name="village-lamps" geometry={built.lamps} material={lampGlow} />
      <group position={[mx, 0, mz]} rotation={[0, facePath(mx, mz), 0]}>
        <mesh ref={sails} name="windmill-sails" geometry={built.sails} material={villageMaterial} position={[0, 5.1, 1.66]} castShadow />
      </group>
      <mesh ref={boat} name="dock-rowboat" geometry={built.boat} material={villageMaterial} position={[HAVEN_DOCK.x + 1.45, 0.02, -1.7]} rotation={[0, 0.18, 0]} castShadow />
      <Campfire />
      <ChimneySmoke points={built.chimneys} />
    </group>
  );
}

const flameMaterial = new T.MeshBasicMaterial({ color: "#ffb04d" }),
  coreMaterial = new T.MeshBasicMaterial({ color: "#ffe39a" }),
  flameGeometry = new T.ConeGeometry(0.22, 0.75, 6);
function Campfire() {
  const flames = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    if (!flames.current || settings.reduced) return;
    flames.current.children.forEach((f, i) => {
      const t = clock.elapsedTime * (7 + i) + i * 2;
      f.scale.set(1 + Math.sin(t) * 0.12, 1 + Math.sin(t * 1.7) * 0.22, 1 + Math.cos(t) * 0.12);
    });
  });
  const [x, z] = HAVEN_CAMPFIRE.point;
  return (
    <group ref={flames} name="campfire-flames" position={[x, 0.42, z]}>
      <mesh geometry={flameGeometry} material={flameMaterial} />
      <mesh geometry={flameGeometry} material={flameMaterial} position={[0.12, -0.08, 0.05]} scale={0.7} rotation={[0, 0, -0.2]} />
      <mesh geometry={flameGeometry} material={coreMaterial} position={[-0.05, -0.08, -0.05]} scale={0.55} />
    </group>
  );
}

function ChimneySmoke({ points }: { points: T.Vector3[] }) {
  const per = settings.quality === "Low" ? 2 : 4;
  const mesh = useMemo(() => {
    const m = new T.InstancedMesh(
      new T.IcosahedronGeometry(0.24, 0),
      new T.MeshStandardMaterial({
        color: "#eeebe2",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        flatShading: true,
      }),
      points.length * per,
    );
    m.name = "chimney-smoke";
    m.frustumCulled = false;
    return m;
  }, [points, per]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as T.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ clock }) => {
    const time = settings.reduced ? 0.3 : clock.elapsedTime;
    points.forEach((p, c) => {
      for (let i = 0; i < per; i++) {
        const t = (time * 0.22 + i / per + c * 0.13) % 1;
        o.position.set(p.x + t * 0.7 + Math.sin(t * 6 + c) * 0.12, p.y + t * 2.6, p.z + t * 0.25);
        o.scale.setScalar(Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.6 + t * 1.4));
        o.rotation.set(t * 2, c, 0);
        o.updateMatrix();
        mesh.setMatrixAt(c * per + i, o.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

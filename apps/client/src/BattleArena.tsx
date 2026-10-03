import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { Kit, SHAPES } from "./village-kit";
import { villageMaterial } from "./HavenVillage";
import { lampGlow } from "./village-materials";
import { settings } from "./audio";

type Particles = "firefly" | "ember" | "bubble" | "snow" | "mote" | "spark" | "star" | "confetti";
type Theme = {
  sky: string;
  fog: string;
  ground: string;
  rim: string;
  ring: string;
  inner: string;
  props: (k: Kit, glow: Kit, x: number, z: number, i: number) => void;
  particles: Particles;
  tint: string;
  light: string;
};
const tree = (k: Kit, _g: Kit, x: number, z: number, i: number) => {
  const s = 0.9 + (i % 3) * 0.25;
  k.add(SHAPES.CYL6, "#7a6650", [x, 1.2 * s, z], [0.25 * s, 2.4 * s, 0.25 * s]);
  k.add(SHAPES.BUSH, ["#7fa578", "#93b483", "#6f9a7a"][i % 3], [x, 3 * s, z], [1.5 * s, 1.3 * s, 1.5 * s]);
  if (i % 2) k.add(SHAPES.BUSH, "#a3bd8b", [x + 0.6, 3.6 * s, z + 0.3], [0.9 * s, 0.8 * s, 0.9 * s]);
};
const rock = (color: string, glowColor?: string) => (k: Kit, g: Kit, x: number, z: number, i: number) => {
  const s = 0.8 + (i % 4) * 0.35;
  k.add(SHAPES.ROCK, color, [x, 0.5 * s, z], [s, s * (0.9 + (i % 3) * 0.3), s]);
  if (glowColor && i % 3 === 0) g.add(SHAPES.BALL, "#fff", [x + 0.4, 0.15, z + 0.3], [0.35, 0.12, 0.35]);
};
const crystal = (colors: string[]) => (k: Kit, g: Kit, x: number, z: number, i: number) => {
  const h = 1.6 + (i % 4) * 0.7;
  k.add(SHAPES.CONE4, colors[i % colors.length], [x, h / 2, z], [0.5, h, 0.5], [0.15 * ((i % 3) - 1), i, 0.1]);
  k.add(SHAPES.CONE4, colors[(i + 1) % colors.length], [x + 0.6, h / 3, z + 0.2], [0.3, h * 0.6, 0.3], [0, i, -0.25]);
  if (i % 2 === 0) g.add(SHAPES.BALL, "#fff", [x, h + 0.2, z], [0.12, 0.12, 0.12]);
};
const column = (k: Kit, _g: Kit, x: number, z: number, i: number) => {
  const broken = i % 3 === 1,
    h = broken ? 1.6 : 4.2;
  k.add(SHAPES.CYL, "#c9c4b2", [x, h / 2, z], [0.45, h, 0.45]);
  k.box("#d9d4c2", [x, 0.12, z], [1.2, 0.24, 1.2]);
  if (!broken) k.box("#d9d4c2", [x, h + 0.15, z], [1.1, 0.3, 1.1]);
  else k.add(SHAPES.CYL, "#c9c4b2", [x + 1, 0.3, z], [0.42, 1.5, 0.42], [0, 0, Math.PI / 2]);
  k.add(SHAPES.BUSH, "#6fa38f", [x - 0.5, 0.2, z + 0.4], [0.5, 0.3, 0.5]);
};
const peak = (k: Kit, g: Kit, x: number, z: number, i: number) => {
  const h = 3 + (i % 4) * 1.4;
  k.add(SHAPES.CONE, i % 2 ? "#8c8a80" : "#9f9c90", [x, h / 2, z], [1.6, h, 1.6]);
  k.add(SHAPES.CONE, "#eef0ea", [x, h - 0.4, z], [0.65, 0.9, 0.65]);
  if (i % 3 === 0) g.add(SHAPES.BALL, "#fff", [x + 1, 0.6, z], [0.2, 0.2, 0.2]);
};
const pillarGold = (k: Kit, g: Kit, x: number, z: number, i: number) => {
  k.add(SHAPES.CYL, "#efe6c9", [x, 2.6, z], [0.4, 5.2, 0.4]);
  k.add(SHAPES.CYL, "#e3bd56", [x, 5.3, z], [0.55, 0.25, 0.55]);
  k.add(SHAPES.CYL, "#e3bd56", [x, 0.12, z], [0.6, 0.25, 0.6]);
  g.add(SHAPES.BALL, "#fff", [x, 5.75, z], [0.28, 0.28, 0.28]);
  if (i % 2) k.add(SHAPES.CONE4, "#f4d673", [x, 6.3, z], [0.25, 0.6, 0.25]);
};
const banner = (k: Kit, g: Kit, x: number, z: number, i: number) => {
  const colors = ["#d9674f", "#5fa7bb", "#f2c75e", "#9bc27a"];
  k.add(SHAPES.CYL6, "#6d5847", [x, 2.2, z], [0.08, 4.4, 0.08]);
  k.box(colors[i % 4], [x + 0.45, 3.5, z], [0.8, 1.4, 0.05], [0, Math.atan2(x, z), 0]);
  g.add(SHAPES.BALL, "#fff", [x, 4.5, z], [0.15, 0.18, 0.15]);
  if (i % 2 === 0) k.box("#a99f86", [x, 0.4, z], [1.4, 0.8, 0.9], [0, Math.atan2(x, z), 0]);
};
const coral = (k: Kit, g: Kit, x: number, z: number, i: number) => {
  const colors = ["#f08f80", "#f2b36b", "#d97aa8", "#7fc6c6"];
  for (let b = 0; b < 3; b++)
    k.add(SHAPES.CYL6, colors[(i + b) % 4], [x + (b - 1) * 0.35, 0.6 + b * 0.25, z], [0.12, 1.2 + b * 0.5, 0.12], [0, 0, (b - 1) * 0.3]);
  k.add(SHAPES.ROCK, "#d8cfa8", [x, 0.2, z + 0.5], [0.6, 0.35, 0.5]);
  if (i % 2) g.add(SHAPES.BALL, "#fff", [x - 0.5, 0.25, z - 0.3], [0.18, 0.14, 0.18]);
};

export const ARENAS: Record<string, Theme> = {
  grove: { sky: "#8fb3a6", fog: "#9cbcae", ground: "#86a77b", rim: "#5f7a5c", ring: "#e8d39c", inner: "#9cb98a", props: tree, particles: "firefly", tint: "#f6f0b0", light: "#fff0ce" },
  embers: { sky: "#b88f7c", fog: "#a87a66", ground: "#8f6d59", rim: "#5a3f36", ring: "#f3a25b", inner: "#a07a62", props: rock("#6b4a3e", "#ff8a3d"), particles: "ember", tint: "#ffae5e", light: "#ffd9b0" },
  tides: { sky: "#90c4d1", fog: "#a3cfd6", ground: "#d6c99c", rim: "#6fa7b5", ring: "#f3ead2", inner: "#e2d6aa", props: coral, particles: "bubble", tint: "#e8f8ff", light: "#f4fbff" },
  frost: { sky: "#b8cdd8", fog: "#c9d9e0", ground: "#e2eaee", rim: "#9db4c0", ring: "#9fd3e8", inner: "#eef4f6", props: crystal(["#bfe3f0", "#e8f6fb", "#9fcfe0"]), particles: "snow", tint: "#ffffff", light: "#eef6ff" },
  rift: { sky: "#3e3b5e", fog: "#4a4572", ground: "#5d5879", rim: "#2e2a45", ring: "#b9a7ff", inner: "#6a6488", props: crystal(["#9e7fc8", "#7fd6e8", "#c7a6ff"]), particles: "mote", tint: "#c7b8ff", light: "#d9d0ff" },
  archive: { sky: "#4f7f8f", fog: "#5d8e9b", ground: "#a3ab9c", rim: "#4e6b70", ring: "#d6f5ff", inner: "#b3baa9", props: column, particles: "bubble", tint: "#d6f5ff", light: "#e3f6ff" },
  skyforge: { sky: "#a2b4c6", fog: "#b4c4d0", ground: "#908d82", rim: "#5f5c55", ring: "#ffd27a", inner: "#a19e92", props: peak, particles: "spark", tint: "#ffd27a", light: "#fff2da" },
  throne: { sky: "#2f3558", fog: "#3b4169", ground: "#d6cba4", rim: "#8c7d55", ring: "#f4d673", inner: "#e4dab6", props: pillarGold, particles: "star", tint: "#fff1bd", light: "#fff4d6" },
  arena: { sky: "#87a8b0", fog: "#9bb5bb", ground: "#ab9f86", rim: "#6d6351", ring: "#f2d593", inner: "#bcb196", props: banner, particles: "confetti", tint: "#f2d593", light: "#fff0ce" },
};
export const arenaTheme = (id?: string) => ARENAS[id || "grove"] || ARENAS.grove;

function Scenery({ theme }: { theme: Theme }) {
  const built = useMemo(() => {
    const k = new Kit(),
      glow = new Kit();
    // A ring of scenery around the battlefield, denser and taller further out.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.1,
        r = 12.5 + (i % 3) * 1.8;
      theme.props(k, glow, Math.cos(a) * r, Math.sin(a) * r, i);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.35,
        r = 20 + (i % 2) * 3;
      theme.props(k, glow, Math.cos(a) * r, Math.sin(a) * r, i + 7);
    }
    return { solid: k.build(), glow: glow.build() };
  }, [theme]);
  useEffect(() => () => [built.solid, built.glow].forEach((g) => g.dispose()), [built]);
  return (
    <>
      <mesh geometry={built.solid} material={villageMaterial} castShadow receiveShadow />
      <mesh geometry={built.glow} material={lampGlow} />
    </>
  );
}
/** Floating particles that set the mood: they rise, fall or hover by theme. */
function Drift({ kind, color }: { kind: Particles; color: string }) {
  const count = settings.quality === "Low" ? 40 : 110;
  const { mesh, seeds } = useMemo(() => {
    const geometry =
      kind === "confetti" ? new T.PlaneGeometry(0.14, 0.09) : kind === "spark" || kind === "star" ? new T.OctahedronGeometry(0.06, 0) : new T.SphereGeometry(kind === "bubble" ? 0.09 : 0.05, 6, 4);
    const material = new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: kind === "bubble" ? 0.45 : 0.85,
      depthWrite: false,
      side: T.DoubleSide,
      blending: kind === "ember" || kind === "mote" || kind === "firefly" ? T.AdditiveBlending : T.NormalBlending,
    });
    const m = new T.InstancedMesh(geometry, material, count);
    if (kind === "confetti") {
      const c = new T.Color();
      for (let i = 0; i < count; i++) m.setColorAt(i, c.set(["#d9674f", "#5fa7bb", "#f2c75e", "#9bc27a"][i % 4]));
    }
    m.frustumCulled = false;
    const seeds = Array.from({ length: count }, (_, i) => ({
      x: Math.sin(i * 12.9898) * 14,
      z: Math.cos(i * 78.233) * 14,
      y: (i * 0.37) % 6,
      s: 0.6 + ((i * 0.618) % 1) * 0.8,
    }));
    return { mesh: m, seeds };
  }, [kind, color, count]);
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
    const t = settings.reduced ? 0 : clock.elapsedTime;
    seeds.forEach((p, i) => {
      const rise = kind === "ember" || kind === "bubble" || kind === "mote" || kind === "spark",
        fall = kind === "snow" || kind === "confetti";
      const y = rise ? (p.y + t * 0.5 * p.s) % 7 : fall ? 7 - ((p.y + t * 0.6 * p.s) % 7) : 1 + p.y * 0.5 + Math.sin(t * p.s + i) * 0.6;
      o.position.set(p.x + Math.sin(t * 0.4 + i) * 0.6, y, p.z + Math.cos(t * 0.3 + i) * 0.6);
      o.rotation.set(t * p.s, t * 0.7, i);
      const twinkle = kind === "firefly" || kind === "star" ? 0.6 + Math.sin(t * 3 + i) * 0.4 : 1;
      o.scale.setScalar(p.s * twinkle);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
/** The battlefield: themed ground, a glowing ring, scenery and particles. */
export function BattleArena({ theme: id }: { theme?: string }) {
  const theme = arenaTheme(id);
  const ring = useRef<T.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current && !settings.reduced) ring.current.rotation.z = clock.elapsedTime * 0.05;
  });
  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, 26, 70]} />
      <hemisphereLight args={[theme.light, theme.rim, 0.9]} />
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <cylinderGeometry args={[10.5, 11.5, 0.6, 40]} />
        <meshStandardMaterial color={theme.ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[7.6, 48]} />
        <meshStandardMaterial color={theme.inner} roughness={1} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[7.45, 7.6, 72, 1, 0, Math.PI * 1.85]} />
        <meshBasicMaterial color={theme.ring} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.9, 1, 48]} />
        <meshBasicMaterial color={theme.ring} transparent opacity={0.6} />
      </mesh>
      {/* The far floor reaches the fog so scenery never floats. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[60, 32]} />
        <meshStandardMaterial color={theme.rim} roughness={1} />
      </mesh>
      <Scenery theme={theme} />
      <Drift kind={theme.particles} color={theme.tint} />
    </>
  );
}

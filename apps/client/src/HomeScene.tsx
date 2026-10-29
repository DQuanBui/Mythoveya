import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as T from "three";
import type { Profile } from "../../../packages/shared/types";
import { HAVEN_HOUSES } from "../../../packages/shared/haven";
import { utcDay } from "../../../packages/shared/town";
import {
  HOME_INTERIORS,
  HOME_SPAWN,
  HOME_STATIONS,
  homeWalkable,
  type HomeInterior,
} from "../../../packages/shared/homes";
import { Explorer, type WalkArea } from "./Scene";
import { WalkContext, type Walker } from "./hover";
import { createAvatar, animateAvatar, createCreature, animateCreature } from "./models";
import { ModelLighting } from "./ModelLighting";
import { WorldInteraction } from "./WorldInteraction";
import { TouchPad } from "./WorldHUD";
import { Kit, SHAPES } from "./village-kit";
import { HouseVisit } from "./HavenHouses";
import type { ExplorationInput } from "./world-guide";
import { audio, settings } from "./audio";
import "./lodges.css";

const shade = (c: string, t: number, to = "#000000") => new T.Color(c).lerp(new T.Color(to), t).getStyle();
const roomMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  glowMaterial = new T.MeshBasicMaterial({ vertexColors: true });

/** The room shell and furniture as two merged meshes: body and glowing bits. */
function buildHome(h: HomeInterior, seed: number) {
  const k = new Kit(),
    g = new Kit();
  // Plank floor, walls with wainscoting, a window and a picture rail.
  for (let i = 0; i < 12; i++)
    k.box(shade(h.floor, (i * 7 + seed) % 3 === 0 ? 0.08 : (i % 2) * 0.04), [-4.4 + i * 0.8, -0.05, -0.05], [0.79, 0.1, 8]);
  k.box(h.wall, [0, 1.6, -4.05], [9.5, 3.2, 0.2]);
  for (const side of [-1, 1]) {
    k.box(h.wall, [side * 4.7, 1.6, 0], [0.2, 3.2, 8.3]);
    k.box(shade(h.wall, 0.22), [side * 4.57, 0.45, 0], [0.06, 0.9, 8.1]);
    k.box(shade(h.floor, 0.3), [side * 4.55, 0.92, 0], [0.08, 0.06, 8.1]);
  }
  k.box(shade(h.wall, 0.22), [0, 0.45, -3.93], [9.3, 0.9, 0.06]);
  k.box(shade(h.floor, 0.3), [0, 0.92, -3.91], [9.3, 0.06, 0.08]);
  k.box(shade(h.floor, 0.35), [0, 3.15, -3.92], [9.4, 0.12, 0.1]);
  // Back window with lit panes.
  k.box(shade(h.floor, 0.2), [1, 1.9, -3.93], [1.5, 1.3, 0.08]);
  g.box("#fbe2a4", [1, 1.9, -3.88], [1.3, 1.1, 0.03]);
  k.box(shade(h.floor, 0.2), [1, 1.9, -3.85], [0.06, 1.1, 0.04]);
  k.box(shade(h.floor, 0.2), [1, 1.9, -3.85], [1.3, 0.06, 0.04]);
  k.box(shade(h.floor, 0.2), [1, 1.22, -3.82], [1.6, 0.08, 0.2]);
  k.add(SHAPES.CYL, "#a8674a", [0.55, 1.36, -3.8], [0.1, 0.2, 0.1]);
  k.add(SHAPES.BUSH, "#7fae6a", [0.55, 1.55, -3.8], [0.17, 0.15, 0.17]);
  // Framed pictures on the side walls.
  for (const [side, z, c] of [[-1, 0.6, h.accent], [1, 0.3, h.rug]] as const) {
    k.box(shade(h.floor, 0.35), [side * 4.56, 1.9, z], [0.04, 0.7, 0.9]);
    k.box(c, [side * 4.53, 1.9, z], [0.03, 0.55, 0.75]);
  }
  // Round rug with a border.
  k.add(SHAPES.CYL, shade(h.rug, 0.25), [0.6, 0.005, 1.4], [1.9, 0.01, 1.25]);
  k.add(SHAPES.CYL, h.rug, [0.6, 0.012, 1.4], [1.7, 0.01, 1.08]);
  k.add(SHAPES.CYL, h.accent, [0.6, 0.018, 1.4], [0.7, 0.01, 0.45]);
  // Table with two stools and something on top.
  k.box(shade(h.floor, 0.25), [0.6, 0.78, -0.4], [1.8, 0.08, 1.1]);
  for (const x of [-0.2, 1.4]) for (const z of [-0.85, 0.05]) k.box(shade(h.floor, 0.35), [x, 0.38, z], [0.08, 0.76, 0.08]);
  for (const x of [-0.6, 1.8]) {
    k.add(SHAPES.CYL, shade(h.floor, 0.2), [x, 0.46, -0.4], [0.25, 0.06, 0.25]);
    k.add(SHAPES.CYL, shade(h.floor, 0.35), [x, 0.22, -0.4], [0.05, 0.44, 0.05]);
  }
  k.add(SHAPES.CYL, "#f2ead8", [0.3, 0.83, -0.4], [0.28, 0.02, 0.28]);
  k.add(SHAPES.CYL, "#e8dcc0", [1.05, 0.9, -0.35], [0.09, 0.16, 0.09]);
  k.add(SHAPES.BUSH, h.accent, [1.05, 1.04, -0.35], [0.12, 0.1, 0.12]);
  // Bookcase on the right wall.
  k.box(shade(h.floor, 0.3), [3.75, 1.2, -2.6], [0.7, 2.4, 2.2]);
  for (let s = 0; s < 4; s++) {
    k.box(shade(h.floor, 0.12), [3.5, 0.3 + s * 0.6, -2.6], [0.4, 0.05, 2]);
    for (let b = 0; b < 7; b++)
      if ((b + s + seed) % 4)
        k.box(["#8e4a3c", "#3f6b78", "#c79a4a", "#5e7a46", h.accent][(b * 3 + s + seed) % 5], [3.5, 0.5 + s * 0.6, -3.4 + b * 0.24], [0.3, 0.32 + ((b + s) % 3) * 0.04, 0.18]);
  }
  // Lectern with the open visitor book.
  k.box(shade(h.floor, 0.3), [3.4, 0.5, 1.6], [0.14, 1, 0.14]);
  k.box(shade(h.floor, 0.3), [3.4, 0.04, 1.6], [0.5, 0.08, 0.5]);
  k.box(shade(h.floor, 0.2), [3.4, 1.02, 1.6], [0.6, 0.06, 0.48], [-0.35, 0, 0]);
  k.box("#f6efdc", [3.4, 1.07, 1.6], [0.52, 0.03, 0.4], [-0.35, 0, 0]);
  k.box("#7a2f2a", [3.4, 1.075, 1.6], [0.02, 0.035, 0.4], [-0.35, 0, 0]);
  // Potted plants in the front corners.
  for (const x of [-3.9, 3.9]) {
    k.add(SHAPES.CYL, "#b2694a", [x, 0.25, 3.3], [0.28, 0.5, 0.28]);
    k.add(SHAPES.BUSH, "#6f9e5c", [x, 0.85, 3.3], [0.45, 0.5, 0.45]);
  }
  // The home's signature corner against the back wall.
  const fx = -2.9,
    fz = -3.3;
  if (h.feature === "oven") {
    k.box("#a65a43", [fx, 0.55, fz], [2.2, 1.1, 0.95]);
    k.add(SHAPES.BALL, "#b8664b", [fx - 0.4, 1.2, fz], [0.75, 0.55, 0.5]);
    k.box(shade("#a65a43", 0.4), [fx - 0.4, 0.95, fz + 0.36], [0.6, 0.45, 0.25]);
    g.box("#ff9a45", [fx - 0.4, 0.92, fz + 0.48], [0.48, 0.32, 0.02]);
    k.box("#d9c8a8", [fx + 0.65, 1.12, fz], [0.85, 0.05, 0.85]);
    for (let i = 0; i < 3; i++) k.add(SHAPES.BALL, "#d69a52", [fx + 0.4 + i * 0.25, 1.22, fz + (i % 2) * 0.2], [0.14, 0.09, 0.2]);
    k.add(SHAPES.CYL, "#7a6858", [fx - 0.4, 2.3, fz - 0.1], [0.2, 1.4, 0.2]);
  } else if (h.feature === "workbench") {
    k.box(shade(h.floor, 0.15), [fx, 0.9, fz], [2.3, 0.1, 0.95]);
    for (const x of [-1, 1]) k.box(shade(h.floor, 0.35), [fx + x, 0.45, fz], [0.1, 0.9, 0.8]);
    k.box("#8a8f94", [fx - 0.6, 1.0, fz], [0.4, 0.1, 0.12]);
    k.box("#6e4d33", [fx - 0.25, 0.98, fz + 0.15], [0.5, 0.06, 0.06], [0, 0.4, 0]);
    for (let i = 0; i < 3; i++) {
      k.add(SHAPES.CYL6, "#4e4a44", [fx + 0.3 + i * 0.35, 1.08, fz - 0.1], [0.1, 0.06, 0.1]);
      g.add(SHAPES.CYL6, "#ffd27a", [fx + 0.3 + i * 0.35, 1.2, fz - 0.1], [0.08, 0.18, 0.08]);
    }
    k.box(shade(h.floor, 0.3), [fx, 1.9, fz - 0.42], [2.2, 0.9, 0.06]);
    for (let i = 0; i < 5; i++) k.box("#5d5650", [fx - 0.8 + i * 0.4, 1.95, fz - 0.37], [0.05, 0.4, 0.04]);
    k.add(SHAPES.BALL, "#c8574a", [fx + 0.9, 1.0, fz + 0.2], [0.12, 0.12, 0.12]);
  } else if (h.feature === "planters") {
    for (const y of [0.5, 1.15]) {
      k.box(shade(h.floor, 0.25), [fx, y, fz], [2.3, 0.08, 0.9]);
      for (let i = 0; i < 5; i++) {
        k.box("#6e5440", [fx - 0.9 + i * 0.45, y + 0.1, fz], [0.36, 0.14, 0.6]);
        k.add(SHAPES.BUSH, i % 2 ? "#8fca72" : "#6ea85a", [fx - 0.9 + i * 0.45, y + 0.28, fz], [0.16, 0.2 + (i % 3) * 0.05, 0.16]);
      }
    }
    for (const x of [-1.1, 1.1]) k.box(shade(h.floor, 0.35), [fx + x, 0.6, fz], [0.08, 1.2, 0.8]);
    g.box("#e9ffd8", [fx, 2.2, fz + 0.1], [1.8, 0.06, 0.1]);
    k.add(SHAPES.CYL, "#4f86a8", [fx + 1.4, 0.18, fz + 0.5], [0.16, 0.36, 0.16]);
  } else if (h.feature === "pantry") {
    k.box(shade(h.floor, 0.3), [fx, 1.2, fz], [2.3, 2.4, 0.8]);
    const jars = ["#c8473f", "#e48b3a", "#7d3f6e", "#e2c14e", "#9a4040"];
    for (let s = 0; s < 3; s++) {
      k.box(shade(h.floor, 0.1), [fx, 0.45 + s * 0.7, fz + 0.15], [2.1, 0.05, 0.6]);
      for (let j = 0; j < 6; j++) {
        k.add(SHAPES.CYL, jars[(j + s * 2) % 5], [fx - 0.85 + j * 0.34, 0.62 + s * 0.7, fz + 0.2], [0.11, 0.28, 0.11]);
        k.add(SHAPES.CYL, "#f1e6c8", [fx - 0.85 + j * 0.34, 0.79 + s * 0.7, fz + 0.2], [0.12, 0.05, 0.12]);
      }
    }
    k.add(SHAPES.CYL, "#9a7346", [fx + 1.5, 0.2, fz + 0.9], [0.35, 0.4, 0.35]);
    for (let i = 0; i < 5; i++) k.add(SHAPES.BALL, i % 2 ? "#d24a3c" : "#e8b84c", [fx + 1.38 + (i % 3) * 0.12, 0.45 + Math.floor(i / 3) * 0.1, fz + 0.82 + (i % 2) * 0.14], [0.1, 0.1, 0.1]);
  } else {
    k.box("#8d8a80", [fx, 1.2, fz - 0.1], [2.3, 2.4, 0.8]);
    k.box(shade("#8d8a80", 0.5), [fx, 0.55, fz + 0.25], [1.1, 0.9, 0.3]);
    g.add(SHAPES.CONE, "#ff9a3c", [fx, 0.38, fz + 0.3], [0.32, 0.5, 0.2]);
    g.add(SHAPES.CONE, "#ffe08a", [fx, 0.32, fz + 0.32], [0.18, 0.32, 0.12]);
    k.box("#7a776e", [fx, 1.08, fz + 0.4], [2.5, 0.12, 0.35]);
    k.add(SHAPES.BALL, "#4f5a5c", [fx + 0.7, 1.28, fz + 0.4], [0.22, 0.18, 0.22]);
    for (let i = 0; i < 6; i++) k.add(SHAPES.BUSH, i % 2 ? "#6f8f52" : "#88a865", [fx - 1.1 + i * 0.44, 2.4 + (i % 2) * 0.05, fz + 0.2], [0.24, 0.12, 0.2]);
  }
  return { body: k.build(), glow: g.build() };
}

function Home({ id, blocked, interact }: { id: string; blocked: boolean; interact: (id: string) => void }) {
  const h = HOME_INTERIORS[id];
  const geo = useMemo(() => buildHome(h, id.length), [id]);
  useEffect(() => () => {
    geo.body.dispose();
    geo.glow.dispose();
  }, [geo]);
  const host = useMemo(() => {
    const m = createAvatar(h.avatar);
    m.position.set(-1.1, 0, -3.15);
    m.userData.groundY = 0;
    return m;
  }, [id]);
  const resident = useMemo(() => {
    const m = createCreature(h.species);
    m.position.set(1.7, 0.02, 1.6);
    m.rotation.y = -0.5;
    m.scale.multiplyScalar(0.75);
    return m;
  }, [id]);
  useFrame(({ clock }) => {
    animateAvatar(host, clock.elapsedTime, false, false, settings.reduced);
    animateCreature(resident, clock.elapsedTime, "idle", 0, settings.reduced);
  });
  return (
    <group name={`home-${id}`}>
      <mesh geometry={geo.body} material={roomMaterial} castShadow receiveShadow />
      <mesh geometry={geo.glow} material={glowMaterial} />
      <primitive object={host} />
      <primitive object={resident} />
      {HOME_STATIONS.map((s) => (
        <WorldInteraction
          key={s.id}
          name={`home-${s.id}`}
          position={[s.point[0], 0.03, s.point[1]]}
          approach={s.point}
          reach={0.8}
          disabled={blocked}
          title={s.id === "host" ? h.host : s.id === "gift" ? h.featureName : s.name}
          activate={() => interact(s.id)}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.46, 32]} />
            <meshStandardMaterial color={h.accent} emissive={h.accent} emissiveIntensity={0.3} />
          </mesh>
          {!blocked && (
            <Html position={[0, 0.75, 0]} center zIndexRange={[3, 0]} style={{ pointerEvents: "none" }}>
              <span className="lodge-marker">{s.id === "host" ? h.host : s.id === "gift" ? h.featureName : s.name}</span>
            </Html>
          )}
        </WorldInteraction>
      ))}
    </group>
  );
}

/** Walk around inside one of Havenreach's visitor-book homes. */
export function HomeScene({
  id,
  profile,
  busy,
  run,
  exit,
}: {
  id: string;
  profile: Profile;
  busy: boolean;
  run: (kind: string, data?: Record<string, unknown>) => Promise<any>;
  exit: () => void;
}) {
  const h = HOME_INTERIORS[id],
    house = HAVEN_HOUSES.find((x) => x.id === id)!;
  const area = useMemo<WalkArea>(
    () => ({
      key: "home-room-v1",
      step: "woodStep",
      allowed: homeWalkable,
      extent: 6,
      home: HOME_SPAWN,
      points: HOME_STATIONS.map((s) => ({ id: s.id, p: [s.point[0], 0, s.point[1]] })),
    }),
    [],
  );
  const [panel, setPanel] = useState(""),
    [near, setNear] = useState(""),
    [line, setLine] = useState(0);
  const walker = useRef<Walker>({ go: () => {} }),
    input = useRef<ExplorationInput>({ x: 0, z: 0 });
  const gifts = profile.town?.gifts,
    given = gifts?.date === utcDay() && gifts.ids.includes(id);
  const interact = (s: string) => {
    if (busy) return;
    if (s === "exit") return exit();
    if (s === "host") setLine((n) => (panel === "host" ? n : (n + 1) % h.lines.length));
    setPanel(s);
    audio.cue("confirm");
  };
  const walk = (s: string) => {
    const st = HOME_STATIONS.find((x) => x.id === s);
    if (st && !panel && !busy) walker.current.go(st.point, 0.8, () => interact(s));
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches("input,select,textarea")) return;
      if (e.code === "Escape" && !busy) setPanel("");
      if (e.code === "KeyE" && !panel && near) walk(near);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [near, panel, busy]);
  return (
    <div className="lodge-visit home-visit" aria-label={house.name}>
      <div className="scene full">
        <Canvas
          shadows
          camera={{ position: [6, 8, 11], fov: 45 }}
          frameloop={panel ? "demand" : "always"}
          dpr={[1, settings.quality === "High" ? 1.75 : 1.3]}
        >
          <WalkContext.Provider value={walker}>
            <color attach="background" args={["#2f2a2c"]} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[3, 8, 5]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
            <pointLight position={[-2.9, 1.6, -2.4]} color="#ffb969" intensity={10} distance={8} />
            <pointLight position={[1, 2.2, -3]} color="#ffe6b0" intensity={5} distance={6} />
            <ModelLighting intensity={0.3} />
            <Home id={id} blocked={!!panel} interact={interact} />
            <Explorer
              {...{ profile, walker, input, area }}
              spawn={HOME_SPAWN}
              blocked={!!panel || busy}
              onNear={setNear}
              onInteract={interact}
              onPosition={() => {}}
              pet={false}
            />
          </WalkContext.Provider>
        </Canvas>
      </div>
      <div className="lodge-hud">
        <header>
          <div>
            <p className="eyebrow">HAVENREACH · VISITING {h.host.toUpperCase()}</p>
            <h1>{house.name}</h1>
            <p>{given ? `${h.host} waves from the ${h.featureName.toLowerCase()}.` : `${h.host} has a little something for you at the ${h.featureName.toLowerCase()}.`}</p>
          </div>
          <button disabled={busy} onClick={exit}>
            Step outside
          </button>
        </header>
        {!panel && (
          <>
            <nav aria-label="Walk around the home">
              {HOME_STATIONS.map((s) => (
                <button key={s.id} disabled={busy} onClick={() => walk(s.id)}>
                  {s.id === "host" ? `Talk to ${h.host}` : s.id === "gift" ? h.featureName : s.name}
                </button>
              ))}
            </nav>
            <p className="lodge-controls">WASD / arrows to move · Click the floor to walk · E to interact · R to reset camera</p>
            <TouchPad input={input} blocked={busy} />
          </>
        )}
      </div>
      {panel && (
        <div className="modal-backdrop">
          <section className="panel modal lodge-dialog" aria-label={`home-${panel}`}>
            <button className="close" aria-label="Close" disabled={busy} onClick={() => setPanel("")}>
              ×
            </button>
            <p className="eyebrow">{house.name}</p>
            {panel === "host" && (
              <>
                <h2>{h.host}</h2>
                <p>“{h.lines[line]}”</p>
                <button onClick={() => setLine((n) => (n + 1) % h.lines.length)}>Ask about something else</button>
              </>
            )}
            {panel === "gift" && (
              <>
                <h2>{h.featureName}</h2>
                <p>{given ? `${h.host} has already shared today's gift. Come back after 00:00 UTC.` : `${h.host} sets something aside for every visitor, once a day.`}</p>
                <button className="primary" disabled={busy || given} onClick={() => run("town-gift", { id })}>
                  {given ? "Gift taken today" : "Accept today's gift"}
                </button>
              </>
            )}
            {panel === "book" && <HouseVisit id={id} profile={profile} run={run} />}
          </section>
        </div>
      )}
    </div>
  );
}

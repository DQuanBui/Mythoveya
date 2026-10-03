import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { byId } from "../../../packages/shared/content";
import type { Profile } from "../../../packages/shared/types";
import {
  ACTIVITIES,
  COURSE,
  CourseSim,
  RACE,
  RaceSim,
  TICKET_PLAYS,
  TICK,
  courseObstacles,
  formatScore,
  raceBonus,
  racePads,
  rivalPresses,
  FISHING,
  FishSim,
  fishingBites,
  type FishKind,
  type Activity,
  type Obstacle,
} from "../../../packages/shared/festival-games";
import { ITEMS, utcDay } from "../../../packages/shared/town";
import { fishWeights, weatherAt } from "../../../packages/shared/weather";
import { api } from "./api";
import { animateAvatar, animateCreature, createAvatar, createCreature } from "./models";
import { dressKeeper } from "./TownScenery";
import { ModelLighting } from "./ModelLighting";
import { Kit, SHAPES } from "./village-kit";
import { villageMaterial } from "./HavenVillage";
import { lampGlow } from "./village-materials";

const TRACK = { rx: 30, rz: 18 };
const STRIPES = ["#d9674f", "#5fa7bb", "#f2c75e", "#9bc27a", "#b49be0"];
/** Striped tents, lantern posts and bunting placed at the given spots. */
function Backdrop({ tents, posts }: { tents: [number, number, number][]; posts: [number, number][] }) {
  const built = useMemo(() => {
    const k = new Kit(),
      glow = new Kit();
    tents.forEach(([x, z, r], i) => {
      k.push([x, 0, z], r);
      for (let j = 0; j < 8; j++)
        k.add(SHAPES.CONE4, j % 2 ? "#f3e3b5" : STRIPES[i % STRIPES.length], [0, 1.6, 0], [2, 3.2, 2], [0, (j / 8) * Math.PI * 2, 0]);
      k.add(SHAPES.CYL6, "#6d5847", [0, 3.5, 0], [0.05, 0.9, 0.05]);
      k.box(STRIPES[(i + 2) % STRIPES.length], [0.22, 3.8, 0], [0.4, 0.22, 0.02]);
      k.pop();
    });
    posts.forEach(([x, z], i) => {
      k.add(SHAPES.CYL6, "#6d5847", [x, 1.6, z], [0.07, 3.2, 0.07]);
      glow.add(SHAPES.BALL, "#fff", [x, 3.3, z], [0.17, 0.2, 0.17]);
      const next = posts[i + 1];
      if (!next || Math.hypot(next[0] - x, next[1] - z) > 14) return;
      const len = Math.hypot(next[0] - x, next[1] - z),
        ang = Math.atan2(next[1] - z, next[0] - x);
      for (let j = 1; j < len / 0.8; j++) {
        const t = (j * 0.8) / len;
        k.add(SHAPES.CONE4, STRIPES[j % STRIPES.length], [x + (next[0] - x) * t, 2.9 - Math.sin(t * Math.PI) * 0.6, z + (next[1] - z) * t], [0.18, -0.34, 0.04], [0, -ang, 0]);
      }
    });
    return { solid: k.build(), glow: glow.build() };
  }, []);
  useEffect(() => () => [built.solid, built.glow].forEach((g) => g.dispose()), [built]);
  return (
    <>
      <mesh geometry={built.solid} material={villageMaterial} />
      <mesh geometry={built.glow} material={lampGlow} />
    </>
  );
}
const RACE_TENTS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return [Math.cos(a) * 44, Math.sin(a) * 30, -a] as [number, number, number];
});
const RACE_POSTS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  return [Math.cos(a) * (TRACK.rx + 8.5), Math.sin(a) * (TRACK.rz + 8.5)] as [number, number];
});
const INFIELD_POSTS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return [Math.cos(a) * (TRACK.rx - 3.5), Math.sin(a) * (TRACK.rz - 3.5)] as [number, number];
});
const COURSE_TENTS = Array.from({ length: 22 }, (_, i) => [i * 12 - 10, -16 - (i % 2) * 3, 0] as [number, number, number]);
const COURSE_POSTS = Array.from({ length: 30 }, (_, i) => [i * 8 - 6, -9] as [number, number]);
const FISH_TENTS = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI + (i / 8) * Math.PI;
  return [Math.cos(a) * 22, Math.sin(a) * 16 - 6, -a] as [number, number, number];
});
const FISH_POSTS = Array.from({ length: 12 }, (_, i) => {
  const a = Math.PI + 0.2 + (i / 11) * (Math.PI - 0.4);
  return [Math.cos(a) * 14, Math.sin(a) * 10 - 5] as [number, number];
});
import { Portrait } from "./portraits";
import { audio, settings } from "./audio";

type Run = (kind: string, value?: any) => Promise<any>;
type BoardRow = { rank: number; profile: string; name: string; score: number };
type Ghost = {
  profile: string;
  name: string;
  score: number;
  inputs: number[];
  bonus?: number;
  species?: string;
  avatar?: number;
  outfit?: string;
};
type Board = { day: string; featured: Activity; today: BoardRow[]; allTime: BoardRow[]; ghosts: Ghost[] };
type Racer = {
  name: string;
  species?: string;
  avatar?: number;
  outfit?: string;
  mine?: boolean;
  sim: RaceSim | CourseSim | FishSim;
};
const FISH_COLORS: Record<FishKind, string> = { minnow: "#c9d6dc", carp: "#e8b34f", skyfin: "#7fc6e8" };

/** The tournament jetty: your keeper, a float that dips on a bite, and fish that leap out. */
function FishingWorld({ racer, clock }: { racer: Racer; clock: { current: number } }) {
  const keeper = useMemo(() => dressKeeper(createAvatar(racer.avatar ?? 0), racer.outfit), [racer]);
  const float = useRef<T.Group>(null),
    ring = useRef<T.Mesh>(null),
    fish = useRef<T.Group>(null),
    fishBody = useRef<T.MeshStandardMaterial>(null);
  const { camera } = useThree();
  useEffect(() => {
    keeper.position.set(0, 0.4, 3.2);
    keeper.rotation.y = Math.PI;
    camera.position.set(2.6, 4.2, 9);
    camera.lookAt(0, 0.4, -2);
  }, [keeper, camera]);
  useFrame(() => {
    const sim = racer.sim as FishSim,
      t = clock.current;
    sim.advance(t);
    animateAvatar(keeper, t / 1000, false, false, settings.reduced);
    keeper.position.y = 0.4;
    const bite = sim.biting();
    if (float.current) float.current.position.y = bite ? -0.18 : Math.sin(t / 400) * 0.04;
    const last = sim.last,
      since = last ? t - last.at : 1e9;
    if (ring.current) {
      const phase = bite ? ((t - (bite.at + FISHING.early)) % 600) / 600 : since < 700 ? since / 700 : -1;
      ring.current.visible = phase >= 0;
      ring.current.scale.setScalar(0.4 + Math.max(0, phase) * 1.6);
      (ring.current.material as T.MeshBasicMaterial).opacity = 0.8 * (1 - Math.max(0, phase));
    }
    if (fish.current) {
      // A landed fish arcs from the float back to the jetty.
      const show = !!last?.fish && since < 900;
      fish.current.visible = show;
      if (show) {
        const k = since / 900;
        fish.current.position.set(0, Math.sin(k * Math.PI) * 2.4, -4 + k * 6.5);
        fish.current.rotation.z = k * 6;
        fishBody.current?.color.set(FISH_COLORS[last!.fish!]);
      }
    }
  });
  return (
    <>
      <color attach="background" args={["#a7c7cf"]} />
      <fog attach="fog" args={["#bcd3d0", 25, 80]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#f4ead1", "#5a8a74", 1.2]} />
      <directionalLight position={[10, 20, 15]} intensity={2} color="#fff0ce" />
      <ModelLighting intensity={0.35} />
      <Backdrop tents={FISH_TENTS} posts={FISH_POSTS} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#a9c98f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5]} scale={[1.4, 1, 1]}>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#6fb0bf" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, 3.5]}>
        <boxGeometry args={[2.2, 0.2, 3.6]} />
        <meshStandardMaterial color="#b49c78" />
      </mesh>
      <primitive object={keeper} />
      {/* Rod and line out to the float. */}
      <mesh position={[0.35, 1.9, 1.3]} rotation={[-0.9, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 3.6, 6]} />
        <meshStandardMaterial color="#6d5847" />
      </mesh>
      <mesh position={[0.2, 1.5, -1.8]} rotation={[0.62, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 4.9, 4]} />
        <meshBasicMaterial color="#f3ead2" />
      </mesh>
      <group position={[0, 0, -4]}>
        <group ref={float}>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color="#d9674f" />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color="#f3ead2" />
          </mesh>
        </group>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      </group>
      <group ref={fish} visible={false}>
        <mesh scale={[0.5, 0.25, 0.18]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial ref={fishBody} color="#c9d6dc" />
        </mesh>
        <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.4]}>
          <coneGeometry args={[0.22, 0.35, 4]} />
          <meshStandardMaterial color="#9aa7ad" />
        </mesh>
      </group>
    </>
  );
}
const LANES = [0, 1.6, 3.2, 4.8];

/** The lap position on the oval for a distance; two laps make a race. */
function onTrack(d: number, lane: number) {
  const lap = RACE.length / RACE.laps,
    a = ((d % lap) / lap) * Math.PI * 2 - Math.PI / 2;
  const rx = TRACK.rx + lane,
    rz = TRACK.rz + lane;
  return { x: Math.cos(a) * rx, z: Math.sin(a) * rz, heading: Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz) };
}

function RaceWorld({ racers, pads, clock }: { racers: Racer[]; pads: number[]; clock: { current: number } }) {
  const models = useMemo(
    () =>
      racers.map((r) => {
        const m = createCreature(r.species || "emberfox");
        if (!r.mine)
          m.traverse((c) => {
            if (c instanceof T.Mesh) {
              c.material = (c.material as T.Material).clone();
              Object.assign(c.material, { transparent: true, opacity: 0.55 });
            }
          });
        return m;
      }),
    [racers],
  );
  const { camera } = useThree();
  useFrame(() => {
    const t = clock.current;
    racers.forEach((r, i) => {
      const sim = r.sim as RaceSim;
      sim.advance(t);
      const p = onTrack(sim.d, LANES[i]),
        m = models[i];
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.heading;
      animateCreature(m, t / 1000, r.sim.finished === null && t > 0 ? "walk" : "idle", 0, settings.reduced);
    });
    // The camera trails the player's companion around the bends.
    const me = racers[0].sim as RaceSim,
      p = onTrack(me.d, 0),
      behind = onTrack(Math.max(0, me.d - 9), -6);
    camera.position.lerp(new T.Vector3(behind.x, 6, behind.z), 0.12);
    camera.lookAt(p.x, 1, p.z);
  });
  const lap = RACE.length / RACE.laps;
  return (
    <>
      <color attach="background" args={["#a7c7cf"]} />
      <fog attach="fog" args={["#bcd3d0", 40, 120]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#f4ead1", "#5a8a74", 1.2]} />
      <directionalLight position={[20, 30, 10]} intensity={2} color="#fff0ce" />
      <ModelLighting intensity={0.35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color="#a9c98f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[TRACK.rx + 2.4, TRACK.rz + 2.4, 1]}>
        <ringGeometry args={[(TRACK.rx - 1.2) / (TRACK.rx + 2.4), 1, 96]} />
        <meshStandardMaterial color="#c99a72" />
      </mesh>
      <Backdrop tents={RACE_TENTS} posts={[...RACE_POSTS, ...INFIELD_POSTS]} />
      {[...pads, ...pads.map((p) => p - lap)].filter((p) => p >= 0 && p < lap + 1).map((p, i) => {
        const at = onTrack(p, 2.4);
        return (
          <group key={i} position={[at.x, 0.03, at.z]} rotation={[0, at.heading, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[7, 8]} />
              <meshBasicMaterial color="#ffd36a" transparent opacity={0.85} />
            </mesh>
            {[-1.6, 1.6].map((z) => (
              <mesh key={z} position={[0, 0.02, z]} rotation={[-Math.PI / 2, 0, Math.PI]}>
                <circleGeometry args={[1.2, 3]} />
                <meshBasicMaterial color="#fff8e6" />
              </mesh>
            ))}
          </group>
        );
      })}
      {(() => {
        const s = onTrack(0, 2.4);
        return (
          <mesh position={[s.x, 0.04, s.z]} rotation={[-Math.PI / 2, 0, -s.heading + Math.PI / 2]}>
            <planeGeometry args={[7.5, 0.6]} />
            <meshBasicMaterial color="#f3ead2" />
          </mesh>
        );
      })()}
      {models.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

function CourseWorld({ racers, obstacles, clock }: { racers: Racer[]; obstacles: Obstacle[]; clock: { current: number } }) {
  const models = useMemo(
    () =>
      racers.map((r) => {
        const m = dressKeeper(createAvatar(r.avatar ?? 0), r.outfit);
        if (!r.mine)
          m.traverse((c) => {
            if (c instanceof T.Mesh) {
              c.material = (c.material as T.Material).clone();
              Object.assign(c.material, { transparent: true, opacity: 0.5 });
            }
          });
        return m;
      }),
    [racers],
  );
  const { camera } = useThree();
  useFrame(() => {
    const t = clock.current;
    racers.forEach((r, i) => {
      const sim = r.sim as CourseSim;
      sim.advance(t);
      const m = models[i],
        a = sim.action && sim.t < sim.action.until ? sim.action : null,
        phase = a ? 1 - (a.until - sim.t) / COURSE.action : 0;
      m.position.set(sim.d, a?.kind === "jump" ? Math.sin(phase * Math.PI) * 1.2 : 0, -i * 2.2);
      m.rotation.set(a?.kind === "slide" ? -1.1 : 0, Math.PI / 2, 0);
      m.userData.groundY = m.position.y;
      animateAvatar(m, t / 1000, sim.finished === null && t > 0 && t >= sim.stallUntil, false, settings.reduced);
      if (a?.kind === "slide") m.position.y = 0.35;
    });
    const me = (racers[0].sim as CourseSim).d;
    camera.position.lerp(new T.Vector3(me + 3, 4.2, 10), 0.15);
    camera.lookAt(me + 6, 1, -2);
  });
  return (
    <>
      <color attach="background" args={["#a7c7cf"]} />
      <fog attach="fog" args={["#bcd3d0", 30, 90]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#f4ead1", "#5a8a74", 1.2]} />
      <directionalLight position={[10, 20, 15]} intensity={2} color="#fff0ce" />
      <ModelLighting intensity={0.35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE.length / 2, -0.02, -3]}>
        <planeGeometry args={[COURSE.length + 60, 30]} />
        <meshStandardMaterial color="#a9c98f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE.length / 2, 0, -3.3]}>
        <planeGeometry args={[COURSE.length + 10, 9]} />
        <meshStandardMaterial color="#d9c79a" />
      </mesh>
      <Backdrop tents={COURSE_TENTS} posts={COURSE_POSTS} />
      <mesh position={[COURSE.length, 1.6, -3.3]}>
        <boxGeometry args={[0.3, 3.2, 9.5]} />
        <meshStandardMaterial color="#d9674f" />
      </mesh>
      {obstacles.map((o, i) =>
        o.kind === "jump" ? (
          <group key={i} position={[o.x, 0, -3.3]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.18, 0.18, 8.5]} />
              <meshStandardMaterial color={i % 2 ? "#d9674f" : "#5fa7bb"} />
            </mesh>
            {[-4.2, 4.2].map((z) => (
              <mesh key={z} position={[0, 0.25, z]}>
                <boxGeometry args={[0.12, 0.5, 0.12]} />
                <meshStandardMaterial color="#efe7d6" />
              </mesh>
            ))}
          </group>
        ) : (
          <group key={i} position={[o.x, 0, -3.3]}>
            <mesh position={[0, 1.15, 0]}>
              <boxGeometry args={[0.25, 0.35, 8.5]} />
              <meshStandardMaterial color="#f2c75e" />
            </mesh>
            {[-4.3, 4.3].map((z) => (
              <mesh key={z} position={[0, 1, z]}>
                <boxGeometry args={[0.12, 2, 0.12]} />
                <meshStandardMaterial color="#efe7d6" />
              </mesh>
            ))}
          </group>
        ),
      )}
      {models.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

function BoardList({ title, rows, me, activity }: { title: string; rows: BoardRow[]; me: string; activity: Activity }) {
  return (
    <section className="fest-board">
      <h3>{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.profile} className={r.profile === me ? "mine" : ""}>
              <span>{r.rank}</span>
              {r.name}
              <b>{formatScore(activity, r.score)}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No runs yet. Be the first!</p>
      )}
    </section>
  );
}

/** Lobby, countdown, live play and results for a festival game. */
export function FestivalGame({
  profile,
  activity,
  run,
  exit,
}: {
  profile: Profile;
  activity: Activity;
  run: Run;
  exit: () => void;
}) {
  const info = ACTIVITIES[activity],
    day = utcDay();
  const [phase, setPhase] = useState<"lobby" | "count" | "play" | "done">("lobby");
  const [board, setBoard] = useState<Board | null>(null);
  const [companion, setCompanion] = useState(profile.team[0] || profile.owned[0]?.id);
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [hud, setHud] = useState({
    t: 0,
    stamina: 100,
    place: 1,
    pad: false,
    lap: 1,
    misses: 0,
    d: 0,
    score: 0,
    combo: 0,
    biting: false,
    catch: "",
  });
  const [racers, setRacers] = useState<Racer[]>([]);
  const clock = useRef(0),
    start = useRef(0),
    inputs = useRef<number[]>([]),
    sent = useRef(false);
  const pads = useMemo(() => racePads(day), [day]);
  const obstacles = useMemo(() => courseObstacles(day), [day]);
  const f = profile.festival;
  const playsLeft = Math.max(0, TICKET_PLAYS - (f?.day === day ? f.plays[activity] || 0 : 0));
  const loadBoard = () =>
    api<Board>(`festival?activity=${activity}`)
      .then(setBoard)
      .catch(() => {});
  useEffect(() => {
    loadBoard();
  }, []);
  const me = racers[0];
  async function begin() {
    if (!(await run("fest-start", { quest: activity }))) return;
    const own = profile.owned.find((o) => o.id === companion);
    const ghosts = (board?.ghosts || []).slice(0, 3);
    const list: Racer[] = [];
    if (activity === "race") {
      list.push({ name: "You", species: own?.species, mine: true, sim: new RaceSim(pads, own ? raceBonus(own) : 0) });
      for (const g of ghosts) {
        const sim = new RaceSim(pads, g.bonus || 0);
        g.inputs.forEach((t) => sim.press(t));
        list.push({ name: g.profile === profile.id ? "Your best" : g.name, species: g.species, sim });
      }
      // Fair rivals fill any empty lanes.
      const rivals = [
        ["Pip's Mossprig", "mossprig", 0.2, 0.35],
        ["Tali's Zippinch", "zippinch", 0.4, 0.6],
        ["Liora's Bubbloom", "bubbloom", 0.5, 0.85],
      ] as const;
      for (const [name, species, bonus, skill] of rivals.slice(0, 4 - list.length)) {
        const sim = new RaceSim(pads, bonus);
        rivalPresses(pads, bonus, skill).forEach((t) => sim.press(t));
        list.push({ name, species, sim });
      }
    } else if (activity === "fishing") {
      const bites = fishingBites(day, fishWeights(weatherAt(Date.now()).weather));
      list.push({ name: "You", avatar: profile.avatar, outfit: f?.outfit, mine: true, sim: new FishSim(bites) });
    } else {
      list.push({ name: "You", avatar: profile.avatar, outfit: f?.outfit, mine: true, sim: new CourseSim(obstacles) });
      for (const g of ghosts) {
        const sim = new CourseSim(obstacles);
        g.inputs.forEach((t) => sim.press(t));
        list.push({ name: g.profile === profile.id ? "Your best" : g.name, avatar: g.avatar, outfit: g.outfit, sim });
      }
    }
    inputs.current = [];
    sent.current = false;
    clock.current = 0;
    setResult(null);
    setRacers(list);
    setPhase("count");
    setCount(3);
  }
  useEffect(() => {
    if (phase !== "count") return;
    if (count === 0) {
      start.current = performance.now();
      setPhase("play");
      audio.cue("victory");
      return;
    }
    audio.cue("confirm");
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);
  // The game clock runs from the end of the countdown.
  useEffect(() => {
    if (phase !== "play") return;
    let frame = 0;
    const tick = () => {
      clock.current = performance.now() - start.current;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hudTimer = setInterval(() => {
      const sim = me.sim;
      const d = sim instanceof FishSim ? 0 : sim.d;
      const ahead = racers.filter((r) => r !== me && !(r.sim instanceof FishSim) && r.sim.d > d).length;
      const last = sim instanceof FishSim ? sim.last : null;
      setHud({
        t: clock.current,
        stamina: sim instanceof RaceSim ? sim.stamina : 0,
        pad: sim instanceof RaceSim ? sim.onPad() : false,
        place: ahead + 1,
        lap: Math.min(RACE.laps, Math.floor(d / (RACE.length / RACE.laps)) + 1),
        misses: sim instanceof CourseSim ? sim.misses : 0,
        d,
        score: sim instanceof FishSim ? sim.score : 0,
        combo: sim instanceof FishSim ? sim.combo : 0,
        biting: sim instanceof FishSim ? !!sim.biting() : false,
        catch: last && clock.current - last.at < 1500 ? (last.fish ? ITEMS[last.fish].name : "Splash! Too early") : "",
      });
      const limit = activity === "race" ? RACE.maxMs : activity === "course" ? COURSE.maxMs : FISHING.round;
      const done = sim.finished !== null || clock.current > limit + 200;
      if (done && !sent.current) {
        sent.current = true;
        audio.cue("victory");
        run("fest-run", { quest: activity, inputs: inputs.current, id: companion }).then((value) => {
          setResult(value || { failed: true });
          setPhase("done");
          loadBoard();
        });
      }
    }, 100);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(hudTimer);
    };
  }, [phase]);
  const press = (kind: "boost" | "jump" | "slide" | "reel") => {
    if (phase !== "play" || !me) return;
    const t = Math.max(1, Math.round(performance.now() - start.current));
    if (activity === "race" && kind === "boost") {
      const sim = me.sim as RaceSim;
      inputs.current.push(t);
      sim.press(t);
      audio.cue(sim.stamina >= (sim.onPad() ? RACE.padCost : RACE.boostCost) ? "confirm" : "error");
    } else if (activity === "fishing" && kind === "reel") {
      const sim = me.sim as FishSim;
      inputs.current.push(t);
      sim.press(t);
      audio.cue(sim.biting() ? "collect" : "error");
    } else if (activity === "course" && (kind === "jump" || kind === "slide")) {
      const value = kind === "jump" ? t : -t;
      inputs.current.push(value);
      me.sim.press(value);
      audio.cue("confirm");
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (activity === "race" && (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")) {
        e.preventDefault();
        press("boost");
      }
      if (activity === "fishing" && (e.code === "Space" || e.code === "KeyE")) {
        e.preventDefault();
        press("reel");
      }
      if (activity === "course") {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          press("jump");
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          press("slide");
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [phase, racers]);

  if (phase === "lobby" || phase === "done")
    return (
      <div className="fest-game-lobby" data-activity={activity}>
        <div className="panel modal wide">
          <button className="close" aria-label="Back to the fair" onClick={exit}>
            ×
          </button>
          <p className="eyebrow">
            LANTERNFAIR ISLE · {board?.featured === activity ? "TODAY'S FEATURED GAME · DOUBLE TICKETS" : "FESTIVAL GAMES"}
          </p>
          <h2>
            {info.icon} {info.name}
          </h2>
          <p className="muted">{info.blurb}</p>
          {phase === "done" && result && !result.failed && (
            <div className="fest-result" data-result>
              <strong>{formatScore(activity, result.score)}</strong>
              <span>
                {result.personal ? "Personal best! · " : ""}
                {result.rank ? `#${result.rank} today` : ""}
                {result.tickets ? ` · +${result.tickets} tickets` : " · no tickets (daily plays used)"}
              </span>
              <small>
                {activity === "race"
                  ? `${result.perfect} pad boosts · ${result.stumbles} stumbles`
                  : activity === "fishing"
                    ? `${result.caught.length} fish landed · ${result.splashes} splashes${result.tickets ? ` · up to ${FISHING.maxCatch} kept in your bag` : ""}`
                    : `${result.cleared} cleared · ${result.misses} missed`}
              </small>
            </div>
          )}
          {activity === "race" && (
            <div className="race-pick">
              <span className="muted">Racing with:</span>
              {profile.team.map((id) => {
                const o = profile.owned.find((x) => x.id === id);
                if (!o) return null;
                return (
                  <button key={id} className={companion === id ? "selected" : ""} onClick={() => setCompanion(id)} title={byId[o.species].name}>
                    <Portrait id={o.species} />
                    <small>+{raceBonus(o).toFixed(2)} m/s</small>
                  </button>
                );
              })}
            </div>
          )}
          <div className="fest-boards">
            <BoardList title="Today" rows={board?.today || []} me={profile.id} activity={activity} />
            <BoardList title="All time" rows={board?.allTime || []} me={profile.id} activity={activity} />
          </div>
          <div className="button-row">
            <button className="primary" onClick={begin}>
              {phase === "done" ? "Play again" : "Start"} · {playsLeft ? `${playsLeft} ticket runs left today` : "practice (no tickets)"}
            </button>
            <button onClick={exit}>Back to the fair</button>
          </div>
          <p className="muted small-print">
            {activity === "race"
              ? "Space or the Boost button: a boost costs 30 stamina, only 15 on a glowing pad, and boosting without stamina makes your companion stumble. The top three runs today race beside you as ghosts."
              : activity === "fishing"
                ? "Space or the Reel button when the float dips. Minnows are worth 1, carp 3 and Skyfin 8, with a bonus for catches in a row. Reeling at still water splashes and scares off the next fish. Rain brings more Skyfin."
                : "Space or ↑ to jump hurdles, ↓ or S to slide under the yellow bars. A wrong move costs a second. The top three runs today run beside you as ghosts."}
          </p>
        </div>
      </div>
    );
  return (
    <div className="fest-game" data-activity={activity}>
      <div className="scene full">
        <Canvas camera={{ position: [0, 6, 20], fov: 50 }} dpr={[1, settings.quality === "High" ? 1.6 : 1.25]}>
          {activity === "race" ? (
            <RaceWorld racers={racers} pads={pads} clock={clock} />
          ) : activity === "fishing" ? (
            <FishingWorld racer={racers[0]} clock={clock} />
          ) : (
            <CourseWorld racers={racers} obstacles={obstacles} clock={clock} />
          )}
        </Canvas>
      </div>
      <div className="fest-hud">
        <div className="fest-timer" data-clock>
          {activity === "fishing"
            ? `${Math.max(0, (FISHING.round - hud.t) / 1000).toFixed(1)} s left`
            : `${(hud.t / 1000).toFixed(1)} s`}
        </div>
        {activity === "race" ? (
          <>
            <div className="fest-meta">
              Lap {hud.lap}/{RACE.laps} · {["1st", "2nd", "3rd", "4th"][hud.place - 1]} place ·{" "}
              {Math.round(RACE.length - hud.d)} m to go
            </div>
            <div className={`stamina ${hud.pad ? "pad" : ""}`} aria-label={`Stamina ${Math.round(hud.stamina)}`}>
              <i style={{ width: `${hud.stamina}%` }} />
              <span>{hud.pad ? "On a pad! Boost for 15" : "Stamina"}</span>
            </div>
          </>
        ) : activity === "fishing" ? (
          <>
            <div className="fest-meta" data-score>
              {hud.score} points{hud.combo > 1 ? ` · combo ×${hud.combo}` : ""}
            </div>
            <div className={`fest-meta fish-call ${hud.biting ? "bite" : ""}`}>
              {hud.catch || (hud.biting ? "Bite! Reel now!" : "Watch the float…")}
            </div>
          </>
        ) : (
          <div className="fest-meta">
            {Math.round(COURSE.length - hud.d)} m to go · {hud.misses} missed
          </div>
        )}
        <div className="racer-names" hidden={activity === "fishing"}>
          {racers.map((r, i) => (
            <span key={i} className={r.mine ? "mine" : ""}>
              {r.name}
            </span>
          ))}
        </div>
      </div>
      {phase === "count" && <div className="fest-count">{count || "Go!"}</div>}
      <div className="fest-controls">
        {activity === "race" ? (
          <button className="primary" onPointerDown={() => press("boost")}>
            ➶ Boost <kbd>Space</kbd>
          </button>
        ) : activity === "fishing" ? (
          <button className="primary" onPointerDown={() => press("reel")}>
            ≈ Reel <kbd>Space</kbd>
          </button>
        ) : (
          <>
            <button className="primary" onPointerDown={() => press("jump")}>
              ⤴ Jump <kbd>Space</kbd>
            </button>
            <button className="primary" onPointerDown={() => press("slide")}>
              ⤵ Slide <kbd>↓</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

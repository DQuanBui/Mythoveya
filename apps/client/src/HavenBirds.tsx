import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  COTTAGE_SIZE,
  HAVEN_COTTAGES,
  HAVEN_LAMPS,
  HAVEN_WELL,
  edgeRadius,
} from "../../../packages/shared/haven";
import { settings } from "./audio";
import { daylight, islandHour } from "./daytime";
import { worldFocus } from "./village-materials";

type Mode = "flock" | "gull" | "perch";
type Bird = {
  mode: Mode;
  palette: number;
  home: T.Vector3;
  pos: T.Vector3;
  vel: T.Vector3;
  heading: number;
  flock: number;
  slot: number;
  state: "sit" | "flee" | "return";
  timer: number;
  scale: number;
};
// Body, head, beak, two wings and a tail; each part is one instanced draw call.
const PALETTES = [
  { body: "#5f86b8", head: "#4f73a3", wing: "#456893", belly: "#e9c39a" },
  { body: "#a5654a", head: "#6b5446", wing: "#7c5a46", belly: "#e8915f" },
  { body: "#9a8a6f", head: "#7d6c55", wing: "#6f604c", belly: "#e7dcc4" },
  { body: "#f2f2ec", head: "#f7f7f2", wing: "#b9c2c6", belly: "#ffffff" },
  { body: "#d9b74e", head: "#c79f2f", wing: "#7a6a3a", belly: "#f1df98" },
];
const FLOCK_PATHS = [
  { cx: 0, cz: 2, rx: 30, rz: 22, y: 7.5, speed: 0.05 },
  { cx: -8, cz: -6, rx: 22, rz: 30, y: 9, speed: -0.04 },
  { cx: 10, cz: 6, rx: 26, rz: 18, y: 6, speed: 0.06 },
];
function perchSites() {
  const sites: T.Vector3[] = [];
  for (const c of HAVEN_COTTAGES) {
    const top = 0.3 + (c.style === "tall" ? 3.5 : 2.3) + (c.style === "tall" ? 1.5 : 1.35);
    for (const along of [-0.4, 0.35]) {
      const w = COTTAGE_SIZE[c.style].w * along;
      sites.push(new T.Vector3(c.point[0] + Math.cos(c.rotation) * w, top + 0.2, c.point[1] - Math.sin(c.rotation) * w));
    }
  }
  for (const [x, z] of HAVEN_LAMPS.slice(0, 8)) sites.push(new T.Vector3(x, 2.5, z));
  sites.push(new T.Vector3(HAVEN_WELL.point[0], 2.45, HAVEN_WELL.point[1]));
  return sites;
}
function makeBirds(): Bird[] {
  const low = settings.quality === "Low",
    birds: Bird[] = [];
  const flockSize = low ? 4 : 6;
  FLOCK_PATHS.forEach((_, f) => {
    for (let i = 0; i < flockSize; i++)
      birds.push({
        mode: "flock", palette: f % 3, home: new T.Vector3(), pos: new T.Vector3(), vel: new T.Vector3(),
        heading: 0, flock: f, slot: i, state: "sit", timer: 0, scale: 0.85 + (i % 3) * 0.1,
      });
  });
  for (let i = 0; i < (low ? 3 : 6); i++)
    birds.push({
      mode: "gull", palette: 3, home: new T.Vector3(), pos: new T.Vector3(), vel: new T.Vector3(),
      heading: 0, flock: 0, slot: i, state: "sit", timer: i * 7, scale: 1.35,
    });
  perchSites()
    .filter((_, i) => !low || i % 2 === 0)
    .forEach((home, i) =>
      birds.push({
        mode: "perch", palette: [0, 1, 2, 4][i % 4], home, pos: home.clone(), vel: new T.Vector3(),
        heading: i * 1.7, flock: 0, slot: i, state: "sit", timer: 0, scale: 0.8,
      }),
    );
  return birds;
}

export function HavenBirds() {
  const birds = useMemo(makeBirds, []);
  const meshes = useMemo(() => {
    const mat = () => new T.MeshStandardMaterial({ roughness: 0.75 });
    const make = (geo: T.BufferGeometry, name: string) => {
      const m = new T.InstancedMesh(geo, mat(), birds.length);
      m.name = name;
      m.frustumCulled = false;
      return m;
    };
    const wing = new T.SphereGeometry(1, 10, 6).translate(1, 0, 0);
    return {
      body: make(new T.SphereGeometry(1, 14, 10), "bird-body"),
      head: make(new T.SphereGeometry(1, 12, 8), "bird-head"),
      beak: make(new T.ConeGeometry(1, 1, 6).rotateX(Math.PI / 2), "bird-beak"),
      left: make(wing, "bird-wing-left"),
      right: make(wing.clone(), "bird-wing-right"),
      tail: make(new T.ConeGeometry(1, 1, 4).rotateX(-Math.PI / 2), "bird-tail"),
    };
  }, [birds]);
  useEffect(() => {
    const c = new T.Color();
    birds.forEach((b, i) => {
      const p = PALETTES[b.palette];
      meshes.body.setColorAt(i, c.set(p.body));
      meshes.head.setColorAt(i, c.set(p.head));
      meshes.beak.setColorAt(i, c.set(b.mode === "gull" ? "#e8b44c" : "#e3a95a"));
      meshes.left.setColorAt(i, c.set(p.wing));
      meshes.right.setColorAt(i, c.set(p.wing));
      meshes.tail.setColorAt(i, c.set(p.wing));
    });
    for (const m of Object.values(meshes)) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return () => {
      for (const m of Object.values(meshes)) {
        m.geometry.dispose();
        (m.material as T.Material).dispose();
        m.dispose();
      }
    };
  }, [birds, meshes]);
  const tmp = useMemo(
    () => ({
      base: new T.Matrix4(),
      local: new T.Matrix4(),
      out: new T.Matrix4(),
      q: new T.Quaternion(),
      e: new T.Euler(),
      v: new T.Vector3(),
      s: new T.Vector3(),
      hidden: new T.Matrix4().makeScale(0, 0, 0),
    }),
    [],
  );
  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 0.1);
    const time = clock.elapsedTime,
      night = daylight(islandHour()).glow > 0.6,
      calm = settings.reduced;
    const { base, local, out, q, e, v, s, hidden } = tmp;
    const place = (mesh: T.InstancedMesh, i: number, pos: number[], scale: number[], rot: number[] = [0, 0, 0]) => {
      local.compose(v.set(pos[0], pos[1], pos[2]), q.setFromEuler(e.set(rot[0], rot[1], rot[2])), s.set(scale[0], scale[1], scale[2]));
      mesh.setMatrixAt(i, out.multiplyMatrices(base, local));
    };
    birds.forEach((b, i) => {
      let flap = 0,
        pitch = 0,
        bank = 0,
        visible = true,
        sitting = false;
      if (b.mode === "flock") {
        const f = FLOCK_PATHS[b.flock],
          a = time * f.speed * (calm ? 0.4 : 1) + b.flock * 2,
          row = Math.floor((b.slot + 1) / 2),
          side = b.slot % 2 ? 1 : -1;
        const cx = f.cx + Math.cos(a) * f.rx,
          cz = f.cz + Math.sin(a) * f.rz,
          tx = -Math.sin(a) * f.rx * Math.sign(f.speed),
          tz = Math.cos(a) * f.rz * Math.sign(f.speed);
        b.heading = Math.atan2(tx, tz);
        // A loose V: each pair trails behind and to the side of the leader.
        const back = row * 1.4,
          lateral = side * row * 1.1;
        b.pos.set(
          cx - Math.sin(b.heading) * back + Math.cos(b.heading) * lateral + Math.sin(time * 0.9 + b.slot) * 0.3,
          f.y + Math.sin(time * 1.3 + b.slot) * 0.35 - row * 0.15,
          cz - Math.cos(b.heading) * back - Math.sin(b.heading) * lateral,
        );
        bank = -0.25 * Math.sign(f.speed);
        flap = (time * 9 + b.slot) % 6 < 3.4 ? Math.sin(time * 14 + b.slot) * 0.8 : 0.15;
        visible = !night;
      } else if (b.mode === "gull") {
        const a = time * 0.07 * (calm ? 0.4 : 1) + b.slot * 1.05,
          r = edgeRadius(a) + 3 + (b.slot % 3) * 2;
        b.pos.set(Math.cos(a) * r, 2 + (b.slot % 3) * 2.5 + Math.sin(time * 0.6 + b.slot) * 1.2, Math.sin(a) * r);
        b.heading = Math.atan2(-Math.sin(a), Math.cos(a));
        bank = 0.35;
        flap = (time + b.timer) % 9 < 1.2 ? Math.sin(time * 9) * 0.7 : 0.05;
        visible = !night;
      } else {
        const near = Math.hypot(worldFocus.x - b.home.x, worldFocus.z - b.home.z);
        if (b.state === "sit" && near < 4.5 && !night) {
          b.state = "flee";
          b.timer = 6 + (b.slot % 4);
          const away = Math.atan2(b.home.x - worldFocus.x, b.home.z - worldFocus.z) + (b.slot % 3 - 1) * 0.6;
          b.vel.set(Math.sin(away) * 5, 3.2, Math.cos(away) * 5);
        }
        if (b.state === "flee") {
          b.timer -= dt;
          b.vel.y = Math.max(0.4, b.vel.y - dt * 0.6);
          b.pos.addScaledVector(b.vel, dt);
          b.heading = Math.atan2(b.vel.x, b.vel.z);
          pitch = -0.3;
          flap = Math.sin(time * 18 + b.slot) * 0.9;
          if (b.timer <= 0 && near > 9) b.state = "return";
        } else if (b.state === "return") {
          v.subVectors(b.home, b.pos);
          const d = v.length();
          if (d < 0.08) {
            b.pos.copy(b.home);
            b.state = "sit";
          } else {
            b.pos.addScaledVector(v.normalize(), Math.min(d, dt * 4.5));
            b.heading = Math.atan2(v.x, v.z);
            flap = d > 1.5 ? Math.sin(time * 14 + b.slot) * 0.7 : 0.6;
            pitch = 0.15;
          }
        } else {
          sitting = true;
          // Look around and peck now and then.
          const beat = (time * 0.5 + b.slot * 0.37) % 4;
          b.heading = b.slot * 1.7 + (beat < 2 ? Math.sin(time * 0.8 + b.slot) * 0.8 : 0);
          pitch = !calm && beat > 3.6 ? 0.6 : 0;
          flap = 0;
        }
      }
      if (!visible) {
        for (const m of Object.values(meshes)) m.setMatrixAt(i, hidden);
        return;
      }
      base.compose(b.pos, q.setFromEuler(e.set(pitch, b.heading, bank, "YXZ")), s.setScalar(b.scale * 0.38));
      place(meshes.body, i, [0, 0, 0], [0.55, 0.5, 0.85]);
      place(meshes.head, i, [0, 0.38, 0.62], [0.36, 0.36, 0.36]);
      place(meshes.beak, i, [0, 0.33, 1.05], [0.1, 0.1, b.mode === "gull" ? 0.35 : 0.24]);
      place(meshes.tail, i, [0, 0.05, -0.95], [0.32, 0.06, 0.55]);
      const fold = sitting ? 1.15 : 0;
      place(meshes.left, i, [0.35, 0.18, 0], [b.mode === "gull" ? 1.25 : 0.85, 0.06, 0.4], [0, fold, -flap]);
      place(meshes.right, i, [-0.35, 0.18, 0], [b.mode === "gull" ? 1.25 : 0.85, 0.06, 0.4], [0, Math.PI - fold, -flap]);
    });
    for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="haven-birds">
      {Object.values(meshes).map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}

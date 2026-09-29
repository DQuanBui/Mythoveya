import * as T from "three";
import { AVATARS, byId } from "../../../packages/shared/content";
const geometry = {
  orb: new T.IcosahedronGeometry(1, 1),
  smooth: new T.SphereGeometry(1, 12, 8),
  cone: new T.ConeGeometry(1, 1, 6),
  box: new T.BoxGeometry(1, 1, 1),
  ring: new T.TorusGeometry(1, 0.055, 6, 40),
};
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: string, glow = false) {
  const key = color + glow;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.78,
        emissive: glow ? color : "#000",
        emissiveIntensity: glow ? 0.45 : 0,
        flatShading: true,
      }),
    );
  return materials.get(key)!;
}
export function part(
  parent: T.Object3D,
  kind: keyof typeof geometry,
  color: string,
  p: number[],
  s: number[],
  rotation?: number[],
  glow = false,
) {
  const m = new T.Mesh(geometry[kind], material(color, glow));
  m.position.set(p[0], p[1], p[2]);
  m.scale.set(s[0], s[1], s[2]);
  if (rotation) m.rotation.set(rotation[0], rotation[1], rotation[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function createCreature(id: string) {
  const s = byId[id],
    g = new T.Group(),
    rig = new T.Group();
  g.add(rig);
  const c = s.color,
    light = new T.Color(c).lerp(new T.Color("#fff3cd"), 0.45).getStyle(),
    dark = new T.Color(c).multiplyScalar(0.5).getStyle();
  const limbs: T.Group[] = [],
    wings: T.Group[] = [],
    tails: T.Group[] = [];
  let headY = 1.12,
    headZ = 0.48;
  const body = (p: number[], scale: number[], color = c) =>
    part(rig, "orb", color, p, scale);
  const limb = (x: number, z: number, len = 0.45) => {
    const l = new T.Group();
    l.position.set(x, 0.6, z);
    rig.add(l);
    part(l, "cone", dark, [0, -len / 2, 0], [0.14, len, 0.15], [Math.PI, 0, 0]);
    part(l, "orb", light, [0, -len, 0.06], [0.16, 0.11, 0.22]);
    limbs.push(l);
  };
  const wing = (side: number, size = 1) => {
    const w = new T.Group();
    w.position.set(side * 0.3, 0.9, 0);
    rig.add(w);
    for (let j = 0; j < 4; j++)
      part(
        w,
        "orb",
        j % 2 ? light : c,
        [side * (0.28 + j * 0.13), 0.05, -j * 0.17],
        [size * (0.42 - j * 0.035), 0.08, size * 0.3],
        [0, side * -0.4, side * 0.22],
      );
    wings.push(w);
  };
  const horn = (x: number, y: number, z: number, sz = 0.4) =>
    part(
      rig,
      "cone",
      light,
      [x, y, z],
      [0.1, sz, 0.12],
      [0.2, 0, -x * 0.7],
      s.tier === "S",
    );
  if (["quadruped", "fox", "antler", "dragon"].includes(s.family)) {
    body([0, 0.72, 0], [0.45, 0.42, 0.7]);
    body([0, 0.68, 0.18], [0.32, 0.3, 0.5], light);
    for (const x of [-0.3, 0.3])
      for (const z of [-0.38, 0.4])
        limb(x, z, s.family === "antler" ? 0.65 : 0.46);
    if (s.family === "antler") {
      headY = 1.35;
      body([0, 1.02, 0.45], [0.21, 0.5, 0.24]);
      for (const side of [-1, 1]) {
        horn(side * 0.22, 1.95, 0.44, 0.7);
        horn(side * 0.43, 1.85, 0.4, 0.45);
        horn(side * 0.3, 2.06, 0.3, 0.3);
      }
    }
    if (s.family === "dragon") {
      wing(-1, 1.2);
      wing(1, 1.2);
      for (let i = 0; i < 3; i++)
        horn((i - 1) * 0.2, 1.58, 0.42, 0.3 + i * 0.07);
      for (let i = 0; i < 4; i++) horn(0, 1.16, -0.65 + i * 0.25, 0.28);
    }
  }
  if (s.family === "bird") {
    body([0, 0.85, 0], [0.4, 0.55, 0.43]);
    headY = 1.42;
    headZ = 0.3;
    limb(-0.16, 0.1, 0.33);
    limb(0.16, 0.1, 0.33);
    wing(-1, 0.9);
    wing(1, 0.9);
    part(
      rig,
      "cone",
      "#e5b679",
      [0, 1.38, 0.73],
      [0.14, 0.4, 0.13],
      [Math.PI / 2, 0, 0],
    );
  }
  if (s.family === "insect") {
    body([0, 0.65, 0], [0.45, 0.3, 0.66]);
    headY = 0.86;
    headZ = 0.62;
    for (const x of [-0.4, 0.4])
      for (const z of [-0.45, 0, 0.45]) {
        const l = new T.Group();
        l.position.set(x, 0.55, z);
        rig.add(l);
        part(
          l,
          "cone",
          dark,
          [x * 0.4, -0.14, 0],
          [0.055, 0.48, 0.06],
          [0, 0, x * 1.4],
        );
        limbs.push(l);
      }
    if (/moth|mantis/i.test(s.appearance)) {
      wing(-1, 1.3);
      wing(1, 1.3);
    } else
      for (const side of [-1, 1])
        body([side * 0.2, 0.85, -0.15], [0.22, 0.12, 0.44], dark);
    horn(-0.2, 1.3, 0.6, 0.5);
    horn(0.2, 1.3, 0.6, 0.5);
  }
  if (s.family === "shell") {
    body([0, 0.73, -0.1], [0.7, 0.55, 0.75], dark);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      body(
        [Math.sin(a) * 0.51, 0.85, Math.cos(a) * 0.51 - 0.1],
        [0.24, 0.22, 0.24],
        i % 2 ? c : light,
      );
    }
    headY = 0.65;
    headZ = 0.74;
    for (const x of [-0.55, 0.55])
      for (const z of [-0.4, 0.4]) limb(x, z, 0.32);
  }
  if (s.family === "amphibian") {
    body([0, 0.62, -0.1], [0.61, 0.36, 0.65]);
    headY = 0.8;
    headZ = 0.47;
    for (const side of [-1, 1]) {
      body([side * 0.5, 0.3, -0.45], [0.35, 0.25, 0.45], dark);
      limb(side * 0.36, 0.4, 0.35);
      body([side * 0.25, 1.08, 0.48], [0.18, 0.19, 0.18], light);
    }
  }
  if (s.family === "serpent") {
    for (let i = 0; i < 8; i++) {
      const p = new T.Group();
      p.position.set(Math.sin(i * 0.8) * 0.35, 0.42 + i * 0.085, -1 + i * 0.22);
      rig.add(p);
      part(
        p,
        "orb",
        i % 2 ? c : dark,
        [0, 0, 0],
        [0.25 - i * 0.009, 0.25, 0.28],
      );
      tails.push(p);
    }
    headY = 1.16;
    headZ = 0.66;
    for (const side of [-1, 1]) horn(side * 0.2, 1.65, 0.63, 0.5);
  }
  if (s.family === "aquatic") {
    body([0, 0.9, 0], [0.44, 0.42, 0.84]);
    headY = 0.99;
    headZ = 0.61;
    wing(-1, 1.15);
    wing(1, 1.15);
    if (/jellyfish|cuttlefish/.test(s.appearance)) {
      body([0, 1.05, 0], [0.66, 0.42, 0.65]);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const l = new T.Group();
        l.position.set(Math.sin(a) * 0.3, 0.65, Math.cos(a) * 0.3);
        rig.add(l);
        part(
          l,
          "cone",
          light,
          [0, -0.3, 0],
          [0.06, 0.65, 0.08],
          [Math.PI, 0, 0.2],
        );
        tails.push(l);
      }
    }
    if (s.id === "pelagryth") {
      body([0, 1.35, 0], [0.24, 0.55, 0.3]);
      headY = 1.8;
      headZ = 0.24;
    }
  }
  if (s.family === "spirit") {
    body([0, 1, 0], [0.52, 0.6, 0.44]);
    headY = 1.25;
    headZ = 0.27;
    for (const side of [-1, 1])
      part(
        rig,
        "cone",
        dark,
        [side * 0.4, 1.5, 0],
        [0.2, 0.65, 0.18],
        [0, 0, -side * 0.5],
      );
    for (let i = 0; i < 3; i++)
      body(
        [Math.sin(i * 2) * 0.5, 0.5, Math.cos(i * 2) * 0.3],
        [0.12, 0.2, 0.13],
        light,
      );
  }
  if (s.family === "golem") {
    body([0, 1.1, 0], [0.73, 0.7, 0.45], dark);
    headY = 1.8;
    headZ = 0.15;
    for (const side of [-1, 1]) {
      body([side * 0.87, 1.25, 0], [0.39, 0.4, 0.4]);
      const l = new T.Group();
      l.position.set(side * 0.85, 1.1, 0);
      rig.add(l);
      part(l, "box", c, [0, -0.35, 0.1], [0.38, 0.7, 0.42]);
      part(l, "orb", dark, [0, -0.7, 0.15], [0.3, 0.3, 0.3]);
      limbs.push(l);
      limb(side * 0.36, 0, 0.45);
    }
    body([0, 1.2, 0.43], [0.24, 0.32, 0.06], light);
  }
  body([0, headY, headZ], [s.family === "fox" ? 0.33 : 0.36, 0.32, 0.34]);
  if (["fox", "quadruped", "antler", "dragon"].includes(s.family)) {
    for (const side of [-1, 1])
      part(
        rig,
        "cone",
        c,
        [side * 0.22, headY + 0.35, headZ - 0.04],
        [0.16, s.family === "fox" ? 0.43 : 0.28, 0.16],
        [0, 0, -side * 0.25],
      );
    body([0, headY - 0.1, headZ + 0.28], [0.23, 0.15, 0.25], light);
    part(
      rig,
      "orb",
      dark,
      [0, headY - 0.03, headZ + 0.49],
      [0.075, 0.06, 0.055],
    );
  }
  for (const side of [-1, 1]) {
    part(
      rig,
      "smooth",
      "#fff5de",
      [side * 0.19, headY + 0.05, headZ + 0.27],
      [0.105, 0.12, 0.068],
    );
    part(
      rig,
      "smooth",
      "#132c37",
      [side * 0.19, headY + 0.055, headZ + 0.325],
      [0.047, 0.071, 0.035],
    );
    part(
      rig,
      "smooth",
      "#ffffff",
      [side * 0.19 - 0.014, headY + 0.085, headZ + 0.35],
      [0.019, 0.022, 0.012],
    );
  }
  if (["fox", "quadruped", "dragon", "antler", "bird"].includes(s.family)) {
    const tail = new T.Group();
    tail.position.set(0, 0.7, -0.65);
    rig.add(tail);
    part(
      tail,
      "orb",
      c,
      [0.1, 0.18, -0.3],
      [0.2 + s.variant * 0.025, 0.2, 0.5],
      [0.2, 0.2, 0],
    );
    part(
      tail,
      "cone",
      light,
      [0.18, 0.25, -0.7],
      [0.22, 0.5, 0.23],
      [Math.PI / 2 + 0.3, 0, 0],
    );
    tails.push(tail);
  }
  // Signature anatomy is derived from the authored species description, with stable variants.
  if (/halo|ring|orbit|crown|sun-disc/.test(s.appearance)) {
    part(
      rig,
      "ring",
      light,
      [0, headY + 0.62, headZ - 0.1],
      [0.46 + s.variant * 0.06, 0.46 + s.variant * 0.06, 0.46],
      [0.3, 0, 0],
      true,
    );
  }
  if (/crystal|ice|icicle|quill|plate|slate|stone|basalt/.test(s.appearance))
    for (let i = 0; i < 3 + s.variant; i++)
      part(
        rig,
        "cone",
        light,
        [(i % 2 ? 1 : -1) * 0.25, 1.02, -0.5 + i * 0.15],
        [0.13, 0.3 + (i % 3) * 0.08, 0.16],
        [0.3, 0, (i % 2 ? 1 : -1) * 0.4],
      );
  if (/leaf|fern|petal|flor|garden|canopy|bloom|sprout/.test(s.appearance))
    for (let i = 0; i < 3 + s.variant; i++) {
      const a = i * 2.4;
      part(
        rig,
        "orb",
        i % 2 ? "#f5ba9c" : "#91c878",
        [Math.sin(a) * 0.32, 1.2 + (i % 3) * 0.13, Math.cos(a) * 0.35 - 0.2],
        [0.15, 0.27, 0.07],
        [0.3, 0, a],
      );
    }
  if (/horn|tusk/.test(s.appearance) && s.family !== "antler")
    for (const side of [-1, 1])
      horn(side * 0.3, headY + 0.36, headZ + 0.12, 0.4);
  for (let i = 0; i <= s.variant; i++)
    body(
      [0.38, 0.75 + i * 0.055, -0.42 + i * 0.16],
      [0.035, 0.085, 0.055],
      light,
    );
  if (s.id === "solkarath")
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        horn(side * (0.18 + i * 0.15), 1.7 - i * 0.03, 0.46 - i * 0.15, 0.5);
  if (s.id === "iskavelle") {
    limb(-0.35, 0, 0.65);
    limb(0.35, 0, 0.65);
  }
  if (s.id === "zephyreon")
    for (const side of [-1, 1])
      part(
        rig,
        "cone",
        light,
        [side * 0.3, 0.8, -1.2],
        [0.15, 0.9, 0.14],
        [Math.PI / 2, 0, side * 0.5],
      );
  g.scale.setScalar(s.size);
  g.userData = { rig, limbs, wings, tails, family: s.family, index: s.index };
  return g;
}
export type Motion =
  | "idle"
  | "walk"
  | "attack"
  | "cast"
  | "ultimate"
  | "hit"
  | "defeat"
  | "entrance"
  | "victory"
  | "guard"
  | "stunned";
export function animateCreature(
  g: T.Group,
  time: number,
  state: Motion = "idle",
  phase = 0,
  reduced = false,
) {
  const { rig, limbs, wings, tails, family, index } = g.userData;
  const floating = ["bird", "aquatic", "spirit"].includes(family),
    speed = 2 + (index % 4) * 0.3;
  const motion = reduced ? 0.2 : 1;
  rig.position.y =
    (floating ? 0.15 : 0) + Math.sin(time * speed) * 0.035 * motion;
  rig.rotation.set(0, 0, 0);
  rig.scale.set(1, 1 + Math.sin(time * speed) * 0.016 * motion, 1);
  limbs.forEach((l: T.Group, i: number) => {
    l.rotation.x =
      state === "walk"
        ? Math.sin(time * 8 + (i % 2) * Math.PI) * 0.5
        : Math.sin(time * speed + i) * 0.035;
  });
  wings.forEach((w: T.Group, i: number) => {
    w.rotation.z =
      Math.sin(time * (state === "walk" ? 8 : 3)) *
      ((i % 2) * 2 - 1) *
      0.27 *
      motion;
  });
  tails.forEach((t: T.Group, i: number) => {
    t.rotation.y = Math.sin(time * 2 + i * 0.7) * 0.22 * motion;
    t.rotation.x = Math.sin(time * 2 + i) * 0.08 * motion;
  });
  if (["attack", "cast", "ultimate"].includes(state)) {
    const p = Math.sin(Math.min(1, phase) * Math.PI);
    rig.position.z = p * (state === "attack" ? 0.4 : 0.15) * motion;
    rig.rotation.x = -p * 0.25 * motion;
    rig.position.y += p * 0.2 * motion;
  }
  if (state === "hit") {
    rig.rotation.z = Math.sin(phase * 20) * 0.1 * motion;
  }
  if (state === "defeat") {
    rig.rotation.z = 1.15;
    rig.position.y = -0.16;
    rig.scale.setScalar(0.8);
  }
  if (state === "entrance") {
    rig.scale.setScalar(0.7 + Math.min(phase, 1) * 0.3);
  }
  if (state === "victory")
    rig.position.y += Math.abs(Math.sin(time * 4)) * 0.18 * motion;
  if (state === "guard") rig.scale.y = 0.85;
  if (state === "stunned") rig.rotation.z = Math.sin(time * 3) * 0.12;
}
export function createAvatar(index: number) {
  const a = AVATARS[index],
    g = new T.Group(),
    limbs: T.Group[] = [];
  const width = index === 4 ? 0.43 : 0.31;
  part(g, "cone", a.coat, [0, 0.92, 0], [width, 0.75, 0.25]);
  part(g, "box", "#4c4944", [0, 0.65, 0], [width * 1.65, 0.08, 0.36]);
  part(g, "orb", a.skin, [0, 1.58, 0], [0.24, 0.28, 0.22]);
  part(g, "orb", a.hair, [0, 1.75, -0.04], [0.25, 0.19, 0.23]);
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.13, 0.66, 0);
    g.add(leg);
    part(leg, "box", "#334a51", [0, -0.24, 0], [0.17, 0.46, 0.18]);
    part(leg, "box", "#443c35", [0, -0.48, 0.07], [0.2, 0.16, 0.3]);
    limbs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * (width - 0.015), 1.19, 0);
    g.add(arm);
    part(
      arm,
      "cone",
      a.coat,
      [side * 0.035, -0.21, 0],
      [0.13, 0.46, 0.13],
      [0, 0, side * 0.12],
    );
    part(arm, "orb", a.skin, [side * 0.05, -0.45, 0], [0.085, 0.11, 0.085]);
    limbs.push(arm);
    part(
      g,
      "orb",
      "#233642",
      [side * 0.085, 1.61, 0.205],
      [0.028, 0.039, 0.02],
    );
  }
  part(g, "box", "#e0c680", [0.07, 0.66, 0.195], [0.13, 0.09, 0.03]);
  part(g, "box", "#a57951", [0, 0.99, -0.27], [0.4, 0.48, 0.19]);
  part(
    g,
    "cone",
    index % 2 ? "#d9b479" : "#c5d6b6",
    [0, 1.32, 0.12],
    [0.28, 0.16, 0.23],
  );
  if ([1, 3].includes(index))
    for (let i = 0; i < 5; i++)
      part(
        g,
        "orb",
        a.hair,
        [0.13, 1.65 - i * 0.11, -0.23],
        [0.09, 0.11, 0.095],
      );
  if (index === 2 || index === 5)
    part(g, "cone", a.coat, [0, 1.1, -0.06], [0.47, 0.45, 0.31]);
  if (index === 7)
    for (const side of [-1, 1])
      part(
        g,
        "ring",
        "#d6b775",
        [side * 0.12, 1.76, 0.19],
        [0.085, 0.085, 0.05],
      );
  g.userData = { limbs, index };
  return g;
}
export function animateAvatar(
  g: T.Group,
  t: number,
  walk = false,
  gesture = false,
  reduced = false,
) {
  g.userData.limbs.forEach((l: T.Group, i: number) => {
    l.rotation.x = walk
      ? Math.sin(t * 8 + Math.floor(i / 2) * Math.PI + (i % 2 ? Math.PI : 0)) *
        0.55
      : i % 2
        ? Math.sin(t * 1.5 + g.userData.index) * 0.035
        : 0;
    if (gesture && i === 1) l.rotation.z = -1.8 + Math.sin(t * 5) * 0.15;
    else l.rotation.z = 0;
  });
  g.position.y = walk
    ? Math.abs(Math.sin(t * 8)) * 0.035
    : Math.sin(t * 2) * 0.008 * (reduced ? 0.2 : 1);
}

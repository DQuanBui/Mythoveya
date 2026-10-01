import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AVATARS, byId } from "../../../packages/shared/content";

// Smooth, rounded primitives give creatures and keepers a clean, soft finish.
const geometry = {
  orb: new T.SphereGeometry(1, 22, 16),
  smooth: new T.SphereGeometry(1, 16, 12),
  cone: new T.ConeGeometry(1, 1, 12),
  box: new RoundedBoxGeometry(1, 1, 1, 2, 0.18),
  ring: new T.TorusGeometry(1, 0.055, 8, 48),
  capsule: new T.CapsuleGeometry(0.5, 1, 6, 12),
};
type Kind = keyof typeof geometry;
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: string, glow = false, gloss = false) {
  const key = color + glow + gloss;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: gloss ? 0.12 : 0.6,
        emissive: glow ? color : "#000",
        emissiveIntensity: glow ? 0.55 : 0,
        envMapIntensity: gloss ? 1.6 : 0.8,
      }),
    );
  return materials.get(key)!;
}
// Merged static parts share one vertex-colored skin material.
const skin = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.6,
  envMapIntensity: 0.8,
});
export function part(
  parent: T.Object3D,
  kind: Kind,
  color: string,
  p: number[],
  s: number[],
  rotation?: number[],
  glow = false,
  gloss = false,
) {
  const m = new T.Mesh(geometry[kind], material(color, glow, gloss));
  m.position.set(p[0], p[1], p[2]);
  m.scale.set(s[0], s[1], s[2]);
  if (rotation) m.rotation.set(rotation[0], rotation[1], rotation[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.merge = !glow && !gloss;
  m.userData.color = color;
  parent.add(m);
  return m;
}
const merged = new Map<string, T.BufferGeometry>();
/** Bakes each group's plain parts into one cached mesh; glowing and glossy parts stay separate. */
function consolidate(root: T.Object3D, key: string) {
  let n = 0;
  const visit = (group: T.Object3D) => {
    const parts = group.children.filter(
      (c): c is T.Mesh => c instanceof T.Mesh && c.userData.merge,
    );
    for (const child of [...group.children])
      if (!(child instanceof T.Mesh)) visit(child);
    if (parts.length < 2) return;
    const id = `${key}:${n++}`;
    let geo = merged.get(id);
    if (!geo) {
      const color = new T.Color();
      geo = mergeGeometries(
        parts.map((m) => {
          m.updateMatrix();
          const g = (
            m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
          ).applyMatrix4(m.matrix);
          color.set(m.userData.color);
          const colors = new Float32Array(g.attributes.position.count * 3);
          for (let i = 0; i < colors.length; i += 3)
            colors.set([color.r, color.g, color.b], i);
          g.setAttribute("color", new T.BufferAttribute(colors, 3));
          return g;
        }),
      )!;
      geo.computeBoundingSphere();
      merged.set(id, geo);
    }
    for (const m of parts) group.remove(m);
    const mesh = new T.Mesh(geo, skin);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  visit(root);
}
const tint = (a: string, b: string, t: number) =>
  new T.Color(a).lerp(new T.Color(b), t).getStyle();

export function createCreature(id: string) {
  const s = byId[id],
    g = new T.Group(),
    rig = new T.Group();
  g.add(rig);
  const c = s.color,
    light = tint(c, "#fff3cd", 0.45),
    cream = tint(c, "#fff8ea", 0.72),
    dark = tint(c, "#1d2a2e", 0.5),
    mid = tint(c, "#2b3a3c", 0.22),
    blush = tint(c, "#ff8d86", 0.55);
  const evolved = !!s.evolvedFrom,
    rare = s.tier === "S" || s.tier === "A";
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
    part(l, "capsule", mid, [0, -len / 2 + 0.05, 0], [0.15, len / 2, 0.16]);
    part(l, "orb", cream, [0, -len + 0.02, 0.05], [0.12, 0.08, 0.16]);
    limbs.push(l);
  };
  const wing = (side: number, size = 1) => {
    const w = new T.Group();
    w.position.set(side * 0.3, 0.9, 0);
    rig.add(w);
    for (let j = 0; j < 5; j++)
      part(
        w,
        "orb",
        j % 2 ? light : c,
        [side * (0.26 + j * 0.12), 0.05 - j * 0.015, -j * 0.15],
        [size * (0.42 - j * 0.04), 0.05, size * 0.27],
        [0, side * -0.4, side * 0.22],
      );
    wings.push(w);
    return w;
  };
  const horn = (x: number, y: number, z: number, sz = 0.4) =>
    part(
      rig,
      "cone",
      cream,
      [x, y, z],
      [0.09, sz, 0.1],
      [0.2, 0, -x * 0.7],
      s.tier === "S",
    );
  if (["quadruped", "fox", "antler", "dragon"].includes(s.family)) {
    body([0, 0.72, 0], [0.45, 0.42, 0.7]);
    body([0, 0.66, 0.2], [0.33, 0.31, 0.5], cream);
    body([0, 0.86, 0.38], [0.3, 0.3, 0.3]);
    for (const x of [-0.29, 0.29])
      for (const z of [-0.38, 0.4])
        limb(x, z, s.family === "antler" ? 0.65 : 0.46);
    if (s.family === "antler") {
      headY = 1.35;
      part(rig, "capsule", c, [0, 1.02, 0.45], [0.2, 0.28, 0.22], [0.25, 0, 0]);
      for (const side of [-1, 1]) {
        horn(side * 0.22, 1.95, 0.44, 0.7);
        horn(side * 0.43, 1.85, 0.4, 0.45);
        horn(side * 0.3, 2.06, 0.3, 0.3);
      }
    }
    if (s.family === "dragon") {
      wing(-1, 1.2);
      wing(1, 1.2);
      for (let i = 0; i < (s.id === "solkarath" ? 0 : 3); i++)
        horn((i - 1) * 0.2, 1.58, 0.42, 0.3 + i * 0.07);
      for (let i = 0; i < 4; i++) horn(0, 1.16, -0.65 + i * 0.25, 0.28);
    }
  }
  if (s.family === "bird") {
    body([0, 0.85, 0], [0.4, 0.52, 0.43]);
    body([0, 0.8, 0.16], [0.3, 0.4, 0.3], cream);
    headY = 1.42;
    headZ = 0.3;
    limb(-0.16, 0.1, 0.33);
    limb(0.16, 0.1, 0.33);
    wing(-1, 0.9);
    wing(1, 0.9);
    part(rig, "cone", "#e5b679", [0, 1.36, 0.71], [0.11, 0.34, 0.1], [Math.PI / 2, 0, 0]);
  }
  if (s.family === "insect") {
    body([0, 0.65, 0], [0.45, 0.3, 0.66]);
    body([0, 0.6, 0.1], [0.34, 0.22, 0.48], cream);
    headY = 0.86;
    headZ = 0.62;
    for (const x of [-0.4, 0.4])
      for (const z of [-0.45, 0, 0.45]) {
        const l = new T.Group();
        l.position.set(x, 0.55, z);
        rig.add(l);
        part(l, "capsule", dark, [x * 0.4, -0.14, 0], [0.05, 0.24, 0.05], [0, 0, x * 1.4]);
        limbs.push(l);
      }
    if (/moth|mantis/i.test(s.appearance)) {
      wing(-1, 1.3);
      wing(1, 1.3);
    } else
      for (const side of [-1, 1])
        body([side * 0.2, 0.86, -0.15], [0.23, 0.12, 0.45], dark);
    horn(-0.2, 1.3, 0.6, 0.5);
    horn(0.2, 1.3, 0.6, 0.5);
  }
  if (s.family === "shell") {
    body([0, 0.73, -0.1], [0.7, 0.55, 0.75], dark);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      body([Math.sin(a) * 0.51, 0.85, Math.cos(a) * 0.51 - 0.1], [0.24, 0.22, 0.24], i % 2 ? c : light);
    }
    headY = 0.65;
    headZ = 0.74;
    for (const x of [-0.55, 0.55]) for (const z of [-0.4, 0.4]) limb(x, z, 0.32);
  }
  if (s.family === "amphibian") {
    body([0, 0.62, -0.1], [0.61, 0.36, 0.65]);
    body([0, 0.55, 0.08], [0.48, 0.26, 0.5], cream);
    headY = 0.8;
    headZ = 0.47;
    for (const side of [-1, 1]) {
      body([side * 0.5, 0.3, -0.45], [0.35, 0.25, 0.45], mid);
      limb(side * 0.36, 0.4, 0.35);
      body([side * 0.25, 1.08, 0.48], [0.18, 0.19, 0.18], light);
    }
  }
  if (s.family === "serpent") {
    for (let i = 0; i < 9; i++) {
      const p = new T.Group();
      p.position.set(Math.sin(i * 0.8) * 0.35, 0.42 + i * 0.077, -1 + i * 0.2);
      rig.add(p);
      part(p, "orb", i % 2 ? c : mid, [0, 0, 0], [0.25 - i * 0.008, 0.24, 0.27]);
      tails.push(p);
    }
    headY = 1.16;
    headZ = 0.66;
    for (const side of [-1, 1]) horn(side * 0.2, 1.65, 0.63, 0.5);
  }
  if (s.family === "aquatic") {
    body([0, 0.9, 0], [0.44, 0.42, 0.84]);
    body([0, 0.82, 0.12], [0.34, 0.3, 0.62], cream);
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
        part(l, "capsule", light, [0, -0.3, 0], [0.05, 0.32, 0.06], [0, 0, 0.2]);
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
      part(rig, "cone", dark, [side * 0.4, 1.5, 0], [0.2, 0.65, 0.18], [0, 0, -side * 0.5]);
    for (let i = 0; i < 3; i++)
      body([Math.sin(i * 2) * 0.5, 0.5, Math.cos(i * 2) * 0.3], [0.12, 0.2, 0.13], light);
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
  // Head, ears, muzzle and a soft face.
  const headW = s.family === "fox" ? 0.33 : 0.36;
  body([0, headY, headZ], [headW, 0.32, 0.34]);
  body([0, headY - 0.12, headZ + 0.1], [headW * 0.85, 0.2, 0.26], cream);
  if (["fox", "quadruped", "antler", "dragon"].includes(s.family)) {
    const tall = s.family === "fox" ? 0.43 : 0.28;
    for (const side of [-1, 1]) {
      part(rig, "cone", c, [side * 0.22, headY + 0.35, headZ - 0.04], [0.16, tall, 0.13], [0, 0, -side * 0.25]);
      part(rig, "cone", tint(c, "#f6b8a8", 0.55), [side * 0.215, headY + 0.33, headZ + 0.0], [0.09, tall * 0.7, 0.05], [0, 0, -side * 0.25]);
    }
    body([0, headY - 0.1, headZ + 0.28], [0.22, 0.15, 0.25], cream);
    part(rig, "orb", "#2a2422", [0, headY - 0.03, headZ + 0.5], [0.07, 0.055, 0.05], undefined, false, true);
  }
  for (const side of [-1, 1]) {
    const ex = side * 0.18,
      ey = headY + 0.05,
      ez = headZ + 0.27;
    part(rig, "smooth", "#fffaf0", [ex, ey, ez], [0.1, 0.115, 0.07], undefined, false, true);
    part(rig, "smooth", rare ? tint(c, "#2a1d10", 0.3) : "#3a2a20", [ex, ey - 0.005, ez + 0.042], [0.065, 0.08, 0.035], undefined, false, true);
    part(rig, "smooth", "#0d1418", [ex, ey - 0.005, ez + 0.06], [0.036, 0.048, 0.02], undefined, false, true);
    part(rig, "smooth", "#ffffff", [ex - side * 0.02, ey + 0.035, ez + 0.075], [0.018, 0.02, 0.01], undefined, true);
    part(rig, "orb", blush, [side * 0.27, headY - 0.07, headZ + 0.2], [0.07, 0.04, 0.03]);
  }
  if (["fox", "quadruped", "dragon", "antler", "bird"].includes(s.family)) {
    const tail = new T.Group();
    tail.position.set(0, 0.7, -0.65);
    rig.add(tail);
    part(tail, "orb", c, [0.1, 0.18, -0.3], [0.2 + s.variant * 0.025, 0.2, 0.5], [0.2, 0.2, 0]);
    part(tail, "cone", light, [0.18, 0.25, -0.7], [0.21, 0.5, 0.22], [Math.PI / 2 + 0.3, 0, 0]);
    tails.push(tail);
  }
  // Signature anatomy is derived from the authored species description, with stable variants.
  if (/crown/.test(s.appearance)) {
    // A fitted crown of glowing points sits on the head.
    part(rig, "ring", light, [0, headY + 0.27, headZ - 0.02], [0.2, 0.2, 0.6], [Math.PI / 2 - 0.25, 0, 0], true);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(rig, "cone", light, [Math.sin(a) * 0.19, headY + 0.36, headZ - 0.02 + Math.cos(a) * 0.19], [0.045, 0.15, 0.045], undefined, true);
    }
  } else if (/halo|ring|orbit|sun-disc/.test(s.appearance))
    part(
      rig,
      "ring",
      light,
      [0, headY + 0.55, headZ - 0.1],
      [0.36 + s.variant * 0.04, 0.36 + s.variant * 0.04, 0.46],
      [0.3, 0, 0],
      true,
    );
  if (/crystal|ice|icicle|quill|plate|slate|stone|basalt/.test(s.appearance))
    for (let i = 0; i < 3 + s.variant; i++)
      part(
        rig,
        "cone",
        light,
        [(i % 2 ? 1 : -1) * 0.25, 1.02, -0.5 + i * 0.15],
        [0.12, 0.3 + (i % 3) * 0.08, 0.14],
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
        [0.15, 0.27, 0.06],
        [0.3, 0, a],
      );
    }
  if (/horn|tusk/.test(s.appearance) && s.family !== "antler" && s.id !== "solkarath")
    for (const side of [-1, 1]) horn(side * 0.3, headY + 0.36, headZ + 0.12, 0.4);
  for (let i = 0; i <= s.variant; i++)
    body([0.38, 0.75 + i * 0.055, -0.42 + i * 0.16], [0.035, 0.085, 0.055], light);
  if (/winged/i.test(s.appearance) && ["quadruped", "fox"].includes(s.family)) {
    wing(-1, 1.2);
    wing(1, 1.2);
  }
  // Evolved forms wear a mane and a crest gem, so the bond's growth shows at a glance.
  if (evolved) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.4;
      part(
        rig,
        "cone",
        i % 2 ? light : c,
        [Math.sin(a) * 0.3, headY - 0.05 + Math.cos(a) * 0.12, headZ - 0.22],
        [0.11, 0.42, 0.11],
        [-1.1, 0, -a * 0.8],
      );
    }
    part(rig, "orb", tint(c, "#ffffff", 0.35), [0, headY + 0.3, headZ + 0.16], [0.075, 0.1, 0.06], undefined, true);
  }
  if (s.id === "ignivara")
    for (const side of [-1, 1]) {
      const rearWing = wing(side, 0.7);
      rearWing.position.z = -0.45;
      rearWing.position.y = 0.75;
    }
  if (s.id === "solkarath") {
    part(rig, "orb", "#ffe4a2", [0, 1.8, 0.36], [0.18, 0.18, 0.18], [0, 0, 0], true);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        horn(side * (0.18 + i * 0.15), 1.7 - i * 0.03, 0.46 - i * 0.15, 0.5);
  }
  if (s.id === "iskavelle") {
    limb(-0.35, 0, 0.65);
    limb(0.35, 0, 0.65);
  }
  if (s.id === "zephyreon")
    for (const side of [-1, 1])
      part(rig, "cone", light, [side * 0.3, 0.8, -1.2], [0.15, 0.9, 0.14], [Math.PI / 2, 0, side * 0.5]);
  consolidate(rig, `creature:${id}`);
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
  rig.position.y = (floating ? 0.15 : 0) + Math.sin(time * speed) * 0.035 * motion;
  rig.rotation.set(0, 0, 0);
  // A soft breathing swell and a slow head-to-tail sway.
  rig.scale.set(
    1 + Math.sin(time * speed) * 0.008 * motion,
    1 + Math.sin(time * speed) * 0.018 * motion,
    1,
  );
  if (state === "idle") rig.rotation.y = Math.sin(time * 0.6 + index) * 0.06 * motion;
  limbs.forEach((l: T.Group, i: number) => {
    l.rotation.x =
      state === "walk"
        ? Math.sin(time * 8 + (i % 2) * Math.PI) * 0.5
        : Math.sin(time * speed + i) * 0.035;
  });
  wings.forEach((w: T.Group, i: number) => {
    w.rotation.z =
      Math.sin(time * (state === "walk" ? 8 : 3)) * ((i % 2) * 2 - 1) * 0.27 * motion;
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
  if (state === "hit") rig.rotation.z = Math.sin(phase * 20) * 0.1 * motion;
  if (state === "defeat") {
    rig.rotation.z = 1.15;
    rig.position.y = -0.16;
    rig.scale.setScalar(0.8);
  }
  if (state === "entrance") rig.scale.setScalar(0.7 + Math.min(phase, 1) * 0.3);
  if (state === "victory") rig.position.y += Math.abs(Math.sin(time * 4)) * 0.18 * motion;
  if (state === "guard") rig.scale.y = 0.85;
  if (state === "stunned") rig.rotation.z = Math.sin(time * 3) * 0.12;
}

// Keepers: rounded proportions, faces with brows and smiles, and per-character hair.
const PANTS = ["#3b4f57", "#33454d", "#4d5a3f", "#3e566b", "#4a4f52", "#3d3446", "#6b6455", "#2f3a46"];
const IRIS = ["#4a3020", "#2c5f63", "#5a7a3a", "#3f6f9a", "#3a2a20", "#6a4a80", "#7a5a2a", "#2a3a4a"];
export function createAvatar(index: number) {
  const a = AVATARS[index],
    g = new T.Group(),
    limbs: T.Group[] = [];
  const broad = index === 4,
    w = broad ? 0.27 : 0.21,
    pants = PANTS[index],
    shoe = "#5b4334",
    skinShade = tint(a.skin, "#5a3020", 0.18);
  // Legs (index order matters for walking: left leg, left arm, right leg, right arm).
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.11, 0.8, 0);
    g.add(leg);
    part(leg, "capsule", pants, [0, -0.34, 0], [0.15, 0.31, 0.16]);
    part(leg, "box", shoe, [0, -0.72, 0.045], [0.15, 0.1, 0.26]);
    limbs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * (w + 0.06), 1.34, 0);
    g.add(arm);
    part(arm, "capsule", a.coat, [side * 0.015, -0.22, 0], [0.11, 0.22, 0.11], [0, 0, side * 0.08]);
    part(arm, "orb", a.skin, [side * 0.03, -0.47, 0.01], [0.065, 0.075, 0.065]);
    limbs.push(arm);
  }
  // Torso, coat hem, belt and backpack.
  part(g, "orb", pants, [0, 0.84, 0], [w * 0.95, 0.13, 0.17]);
  part(g, "capsule", a.coat, [0, 1.12, 0], [w * 2, 0.22, 0.34]);
  part(g, "cone", a.coat, [0, 0.95, 0], [w * 1.08, 0.36, 0.2]);
  part(g, "box", "#4c4038", [0, 0.88, 0], [w * 2.05, 0.06, 0.36]);
  part(g, "box", "#e0c680", [0.07, 0.88, 0.18], [0.07, 0.05, 0.02], undefined, false, true);
  part(g, "box", "#a57951", [0, 1.12, -0.22], [0.32, 0.4, 0.15]);
  part(g, "capsule", "#c9b38a", [0, 1.36, -0.22], [0.09, 0.15, 0.09], [0, 0, Math.PI / 2]);
  part(g, "orb", index % 2 ? "#d9b479" : "#c5d6b6", [0, 1.36, 0.03], [w * 0.95, 0.045, 0.15]);
  // Neck and head.
  part(g, "capsule", a.skin, [0, 1.42, 0], [0.09, 0.05, 0.09]);
  const head = new T.Group();
  head.position.set(0, 1.62, 0);
  g.add(head);
  part(head, "orb", a.skin, [0, 0, 0], [0.2, 0.225, 0.2]);
  for (const side of [-1, 1]) {
    part(head, "orb", a.skin, [side * 0.195, -0.01, -0.01], [0.04, 0.055, 0.035]);
    part(head, "smooth", "#fffaf2", [side * 0.072, 0.015, 0.172], [0.04, 0.042, 0.02], undefined, false, true);
    part(head, "smooth", IRIS[index], [side * 0.072, 0.012, 0.185], [0.026, 0.03, 0.012], undefined, false, true);
    part(head, "smooth", "#0b1013", [side * 0.072, 0.012, 0.192], [0.013, 0.016, 0.008], undefined, false, true);
    part(head, "smooth", "#ffffff", [side * 0.068, 0.022, 0.197], [0.006, 0.007, 0.004], undefined, true);
    part(head, "box", a.hair, [side * 0.075, 0.072, 0.17], [0.07, 0.016, 0.02], [0, 0, side * -0.12]);
    part(head, "orb", tint(a.skin, "#ff8f80", 0.35), [side * 0.11, -0.05, 0.15], [0.035, 0.022, 0.012]);
  }
  part(head, "orb", skinShade, [0, -0.025, 0.2], [0.025, 0.03, 0.025]);
  part(head, "ring", "#7a3f35", [0, -0.075, 0.178], [0.035, 0.022, 0.03], [0, 0, Math.PI]);
  hair(head, index, a.hair);
  // Character accents.
  if (index === 2 || index === 5) part(g, "cone", a.coat, [0, 1.08, -0.06], [0.34, 0.62, 0.24]);
  if (index === 3) part(g, "ring", "#71c3e6", [0, 1.42, 0], [0.13, 0.13, 0.5], [Math.PI / 2, 0, 0]);
  if (index === 4)
    for (const side of [-1, 1])
      part(g, "orb", "#9aa6a6", [side * 0.3, 1.36, 0], [0.12, 0.09, 0.13]);
  if (index === 6) part(g, "cone", a.coat, [0, 0.82, 0], [w * 1.25, 0.3, 0.22]);
  if (index === 7)
    for (const side of [-1, 1])
      part(head, "ring", "#d6b775", [side * 0.075, 0.16, 0.13], [0.055, 0.055, 0.05], [0.3, 0, 0], false, true);
  consolidate(g, `avatar:${index}`);
  g.userData = { limbs, index, head };
  return g;
}
function hair(head: T.Group, index: number, color: string) {
  const h = (p: number[], s: number[], r?: number[]) => part(head, "orb", color, p, s, r);
  h([0, 0.07, -0.015], [0.215, 0.18, 0.215]);
  h([0, 0.1, 0.06], [0.19, 0.08, 0.16]);
  if (index === 0)
    for (let i = 0; i < 5; i++)
      part(head, "cone", color, [(i - 2) * 0.07, 0.22, 0.02 - Math.abs(i - 2) * 0.02], [0.05, 0.12, 0.05], [-0.3, 0, (i - 2) * -0.3]);
  if (index === 1 || index === 3)
    for (let i = 0; i < 5; i++) h([0.06, -0.02 - i * 0.1, -0.2], [0.065, 0.075, 0.065]);
  if (index === 2)
    for (const side of [-1, 1]) h([side * 0.17, -0.06, 0], [0.07, 0.15, 0.1]);
  if (index === 4) h([0, 0.09, -0.02], [0.205, 0.13, 0.205]);
  if (index === 5) {
    h([0, -0.12, -0.12], [0.2, 0.28, 0.12]);
    for (const side of [-1, 1]) h([side * 0.17, -0.12, 0.02], [0.06, 0.2, 0.08]);
  }
  if (index === 6)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      h([Math.cos(a) * 0.17, 0.12 + Math.sin(a * 2) * 0.03, Math.sin(a) * 0.15 - 0.02], [0.07, 0.07, 0.07]);
    }
  if (index === 7) h([0, 0.0, -0.13], [0.18, 0.2, 0.1]);
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
      ? Math.sin(t * 8 + Math.floor(i / 2) * Math.PI + (i % 2 ? Math.PI : 0)) * 0.55
      : i % 2
        ? Math.sin(t * 1.5 + g.userData.index) * 0.035
        : 0;
    if (gesture && i === 1) l.rotation.z = -1.8 + Math.sin(t * 5) * 0.15;
    else l.rotation.z = 0;
  });
  const head = g.userData.head as T.Group | undefined;
  if (head) {
    head.rotation.y = walk || reduced ? 0 : Math.sin(t * 0.7 + g.userData.index) * 0.18;
    head.rotation.x = walk ? 0.05 : Math.sin(t * 0.9 + g.userData.index) * 0.04;
  }
  g.position.y = walk
    ? Math.abs(Math.sin(t * 8)) * 0.035
    : Math.sin(t * 2) * 0.008 * (reduced ? 0.2 : 1);
}

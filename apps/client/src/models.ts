import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AVATARS, byId } from "../../../packages/shared/content";
import { dnaOf } from "./creature-dna";

// Low graphics quality keeps the lighter geometry and plain materials.
// (Read directly: this module also runs in Node tests, without audio.ts.)
const fine = (() => {
  try {
    return JSON.parse(localStorage.getItem("mythoveya-settings") || "{}").quality !== "Low";
  } catch {
    return true;
  }
})();
// Smooth, rounded primitives give creatures and keepers a clean, soft finish.
const geometry = {
  // About 3-4k triangles per creature on Low, roughly double otherwise.
  orb: fine ? new T.SphereGeometry(1, 20, 14) : new T.SphereGeometry(1, 14, 10),
  smooth: fine ? new T.SphereGeometry(1, 14, 10) : new T.SphereGeometry(1, 10, 8),
  cone: new T.ConeGeometry(1, 1, fine ? 12 : 9),
  box: new RoundedBoxGeometry(1, 1, 1, fine ? 2 : 1, 0.18),
  ring: new T.TorusGeometry(1, 0.055, 6, 32),
  // Half a ring, for smiles and eyelid lines.
  arc: new T.TorusGeometry(1, 0.16, 6, 16, Math.PI),
  band: new T.CylinderGeometry(1, 1, 1, fine ? 20 : 14),
  capsule: fine ? new T.CapsuleGeometry(0.5, 1, 4, 12) : new T.CapsuleGeometry(0.5, 1, 3, 9),
};
type Kind = keyof typeof geometry;
const materials = new Map<string, T.MeshStandardMaterial>();
// Fur and cloth get a soft sheen at the silhouette; eyes and noses a wet clearcoat.
function finish(base: T.MeshStandardMaterialParameters, gloss: boolean) {
  if (!fine) return new T.MeshStandardMaterial(base);
  return new T.MeshPhysicalMaterial({
    ...base,
    ...(gloss
      ? { clearcoat: 0.7, clearcoatRoughness: 0.08 }
      : { roughness: 0.68, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new T.Color("#fff3e2") }),
  });
}
function material(color: string, glow = false, gloss = false) {
  const key = color + glow + gloss;
  if (!materials.has(key))
    materials.set(
      key,
      finish(
        {
          color,
          roughness: gloss ? 0.12 : 0.6,
          emissive: glow ? color : "#000",
          emissiveIntensity: glow ? 0.55 : 0,
          envMapIntensity: gloss ? 1.6 : 0.8,
        },
        gloss,
      ),
    );
  return materials.get(key)!;
}
// Merged static parts share one vertex-colored skin material.
const skin = finish({ vertexColors: true, roughness: 0.6, envMapIntensity: 0.8 }, false);
// Light caught in fur and cloth brightens the silhouette, in proportion to
// the light already falling there (so nothing glows at night).
if (fine)
  skin.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `outgoingLight += totalDiffuse * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * 0.85;
      #include <opaque_fragment>`,
    );
  };
// Painted shading baked into merged parts: undersides a little darker,
// with faint mottling so large surfaces read as fur or cloth, not plastic.
function shade(g: T.BufferGeometry, color: T.Color) {
  const pos = g.attributes.position,
    nor = g.attributes.normal,
    out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i),
      up = fine ? 0.88 + 0.12 * (nor.getY(i) * 0.5 + 0.5) : 1,
      // Smooth, low-frequency mottling (a few patches per body length).
      grain = fine ? 1 + 0.035 * Math.sin(x * 7.1 + y * 5.3) * Math.sin(z * 6.7 - y * 3.1) : 1,
      k = up * grain;
    out[i * 3] = color.r * k;
    out[i * 3 + 1] = color.g * k;
    out[i * 3 + 2] = color.b * k;
  }
  g.setAttribute("color", new T.BufferAttribute(out, 3));
}
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
          shade(g, color);
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

/** Rotate the existing palette without changing a species' anatomy or shared DNA. */
function shimmerDna(dna: ReturnType<typeof dnaOf>) {
  const next = { ...dna };
  for (const key of ["base", "light", "cream", "dark", "mid", "accent", "blush", "iris"] as const) {
    const c = new T.Color(dna[key]);
    c.offsetHSL(0.38, 0.08, key === "dark" ? 0.03 : 0.08);
    next[key] = c.getStyle();
  }
  return next;
}

export function createCreature(id: string, shimmer = false) {
  const s = byId[id],
    g = new T.Group(),
    rig = new T.Group();
  g.add(rig);
  // Each species' own palette and anatomy; see creature-dna.ts.
  const dna = shimmer ? shimmerDna(dnaOf(s)) : dnaOf(s),
    f = dna.features;
  const c = dna.base,
    light = dna.light,
    cream = dna.cream,
    dark = dna.dark,
    mid = dna.mid,
    accent = dna.accent,
    blush = dna.blush;
  const evolved = !!s.evolvedFrom,
    rank = ["E", "D", "C", "B", "A", "S"].indexOf(s.tier),
    rare = rank >= 4;
  const limbs: T.Group[] = [],
    wings: T.Group[] = [],
    tails: T.Group[] = [],
    eyes: T.Group[] = [];
  const four = ["quadruped", "fox", "antler", "dragon"].includes(s.family),
    pawed = four || s.family === "amphibian",
    // Soft-coated species get cheek and chest tufts; scaled or stony ones do not.
    furry = ["quadruped", "fox", "antler"].includes(s.family) &&
      !/scale|stone|plate|shell|crystal|basalt|ice|magma|lava|metal|bark/.test(s.appearance);
  const [bx, by, bz] = dna.body;
  // Longer legs lift the whole body.
  const baseLeg = s.family === "antler" ? 0.62 : 0.46,
    legLen = baseLeg * (four ? dna.legs : 1),
    lift = four ? legLen - baseLeg : 0;
  let headY = 1.12 + lift,
    headZ = 0.48;
  const body = (p: number[], scale: number[], color = c) =>
    part(rig, "orb", color, p, scale);
  const limb = (x: number, z: number, len = 0.45, y = 0.6) => {
    const l = new T.Group();
    l.position.set(x, y, z);
    rig.add(l);
    part(l, "capsule", mid, [0, -len / 2 + 0.05, 0], [0.15, len / 2, 0.16]);
    // Socks give some species pale feet.
    const foot = dna.marking === "socks" ? "#fbf6ea" : cream;
    part(l, "orb", foot, [0, -len + 0.02, 0.05], [0.12, 0.08, 0.16]);
    // Little rounded toes at the front of each paw.
    if (pawed)
      for (let k = -1; k <= 1; k++)
        part(l, "orb", foot, [k * 0.055, -len + 0.005, 0.175 - Math.abs(k) * 0.02], [0.042, 0.045, 0.05]);
    limbs.push(l);
  };
  const wing = (side: number, size = 1, feather = light) => {
    const w = new T.Group();
    w.position.set(side * 0.3, 0.9 + lift, 0);
    rig.add(w);
    for (let j = 0; j < 5; j++)
      part(
        w,
        "orb",
        j % 2 ? feather : j === 4 ? accent : c,
        [side * (0.26 + j * 0.12), 0.05 - j * 0.015, -j * 0.15],
        [size * (0.42 - j * 0.04), 0.05, size * 0.27],
        [0, side * -0.4, side * 0.22],
      );
    wings.push(w);
    return w;
  };
  const horn = (x: number, y: number, z: number, sz = 0.4, color = cream) =>
    part(rig, "cone", color, [x, y, z], [0.09, sz, 0.1], [0.2, 0, -x * 0.7], s.tier === "S");
  if (four) {
    const ty = 0.72 + lift;
    body([0, ty, 0], [0.45 * bx, 0.42 * by, 0.7 * bz]);
    body([0, ty - 0.06, 0.2 * bz], [0.33 * bx, 0.31 * by, 0.5 * bz], cream);
    body([0, ty + 0.14, 0.38 * bz], [0.3 * bx, 0.3 * by, 0.3]);
    for (const x of [-0.29, 0.29])
      for (const z of [-0.38, 0.4]) limb(x * bx, z * bz, legLen, 0.6 + lift);
    // Markings across the back.
    if (dna.marking === "stripes")
      for (let i = 0; i < 3; i++)
        part(rig, "capsule", dark, [0, ty + 0.36 * by, (-0.35 + i * 0.3) * bz], [0.08, 0.38 * bx, 0.06], [0, 0, Math.PI / 2]);
    if (dna.marking === "spots")
      for (let i = 0; i < 5; i++)
        body([(i % 2 ? 1 : -1) * 0.22 * bx, ty + 0.3 * by - (i % 3) * 0.05, (-0.45 + i * 0.2) * bz], [0.09, 0.05, 0.09], accent);
    if (dna.marking === "saddle") body([0, ty + 0.3 * by, -0.12 * bz], [0.36 * bx, 0.16, 0.38 * bz], accent);
    // A fluffy bib on the chest.
    if (furry)
      for (let k = -1; k <= 1; k++)
        part(rig, "cone", cream, [k * 0.09 * bx, ty - 0.13 * by - Math.abs(k) * 0.03, 0.62 * bz], [0.075, 0.2, 0.06], [Math.PI - 0.5, 0, k * 0.35]);
    // Rare species carry a longer neck for a prouder stance.
    if (dna.neck) {
      part(rig, "capsule", c, [0, ty + 0.4, 0.42 * bz], [0.19, 0.24 + dna.neck, 0.2], [0.35, 0, 0]);
      headY += dna.neck + 0.08;
      headZ += 0.06;
    }
    // Dorsal sails, digging claws and other named anatomy.
    if (f.sail)
      for (let i = 0; i < 5; i++)
        part(rig, "orb", i % 2 ? accent : light, [0, ty + 0.42 * by + Math.sin((i / 4) * Math.PI) * 0.12, (-0.45 + i * 0.22) * bz], [0.03, 0.2 + Math.sin((i / 4) * Math.PI) * 0.12, 0.13], undefined, f.molten);
    if (f.claws && s.id !== "solmole")
      for (const x of [-0.29, 0.29])
        for (let k = 0; k < 3; k++)
          part(rig, "cone", f.molten ? "#ffb04a" : accent, [x * bx + (k - 1) * 0.06, 0.08, 0.4 * bz + 0.18], [0.035, 0.14, 0.035], [Math.PI / 2, 0, 0], f.molten);
    if (s.family === "antler") {
      headY = Math.max(headY, 1.35 + lift);
      part(rig, "capsule", c, [0, 1.02 + lift, 0.45], [0.2, 0.28, 0.22], [0.25, 0, 0]);
      for (const side of [-1, 1]) {
        horn(side * 0.22, headY + 0.6, headZ - 0.04, 0.7);
        horn(side * 0.43, headY + 0.5, headZ - 0.08, 0.45);
        horn(side * 0.3, headY + 0.71, headZ - 0.18, 0.3);
      }
    }
    if (s.family === "dragon" && s.id !== "reedrake") {
      wing(-1, 1.2);
      wing(1, 1.2);
      for (let i = 0; i < (s.id === "solkarath" ? 0 : 3); i++)
        horn((i - 1) * 0.2, headY + 0.46, headZ - 0.06, 0.3 + i * 0.07);
      for (let i = 0; i < 4; i++) horn(0, ty + 0.44, (-0.65 + i * 0.25) * bz, 0.28, accent);
    }
  }
  if (s.family === "bird") {
    const up = f.tallBird ? 0.42 : 0;
    body([0, 0.85 + up, 0], [0.4 * bx, 0.52 * by, 0.43 * bz]);
    body([0, 0.8 + up, 0.16], [0.3 * bx, 0.4 * by, 0.3], cream);
    headY = 1.42 + up;
    headZ = 0.3;
    if (f.tallBird) {
      part(rig, "capsule", c, [0, 1.3 + up, 0.22], [0.13, 0.3, 0.14], [0.3, 0, 0]);
      headY += 0.25;
      headZ += 0.1;
    }
    limb(-0.16, 0.1, 0.33 + up, 0.6 + up);
    limb(0.16, 0.1, 0.33 + up, 0.6 + up);
    for (const w of s.id === "lumeswallow" ? [] : [wing(-1, 0.9 * bx, dna.marking === "none" ? light : accent), wing(1, 0.9 * bx, dna.marking === "none" ? light : accent)])
      w.position.y += up;
    if (!f.bat)
      part(
        rig,
        "cone",
        f.needleBeak ? "#3a3a3a" : "#e5b679",
        [0, headY - 0.06, headZ + (f.needleBeak ? 0.62 : 0.41)],
        f.needleBeak ? [0.035, 0.6, 0.035] : [0.11, 0.34, 0.1],
        [Math.PI / 2, 0, 0],
      );
    if (f.owl) {
      body([0, headY + 0.02, headZ + 0.2], [0.34, 0.3, 0.08], cream);
      for (const side of [-1, 1])
        part(rig, "cone", c, [side * 0.2, headY + 0.38, headZ - 0.02], [0.08, 0.26, 0.08], [0, 0, -side * 0.3]);
    }
    if (f.bat)
      for (const side of [-1, 1])
        part(rig, "cone", c, [side * 0.2, headY + 0.38, headZ - 0.02], [0.13, 0.42, 0.1], [0, 0, -side * 0.35]);
    // A crest of feathers on top of the head.
    if (!f.owl && !f.bat && s.id !== "lumeswallow")
      for (let i = 0; i < 3; i++)
        part(rig, "cone", i === 1 ? accent : c, [(i - 1) * 0.08, headY + 0.4, headZ - 0.08 - i * 0.04], [0.05, 0.22 + (i === 1 ? 0.08 : 0), 0.05], [-0.5, 0, (i - 1) * 0.3]);
  }
  if (s.family === "insect") {
    body([0, 0.65, 0], [0.45 * bx, 0.3 * by, 0.66 * bz]);
    body([0, 0.6, 0.1], [0.34 * bx, 0.22, 0.48 * bz], cream);
    headY = 0.86;
    headZ = 0.62;
    for (const x of [-0.4, 0.4])
      for (const z of (s.id === "mossloom" ? [-0.6, -0.2, 0.2, 0.6] : [-0.45, 0, 0.45])) {
        const l = new T.Group();
        l.position.set(x, 0.55, z);
        rig.add(l);
        if(s.id!=="mossloom") part(l, "capsule", dark, [x * 0.4, -0.14, 0], [0.05, 0.24, 0.05], [0, 0, x * 1.4]);
        limbs.push(l);
      }
    if (s.id === "lanternmoth" || s.id === "velvetmoth") {
      // Broad luna wings are added by the authored anatomy below.
    } else if (/moth|mantis|winged|wing/i.test(s.appearance)) {
      wing(-1, 1.3, accent);
      wing(1, 1.3, accent);
    } else
      for (const side of [-1, 1]) body([side * 0.2, 0.86, -0.15], [0.23, 0.12, 0.45], dna.marking === "spots" ? accent : dark);
    if(s.id!=="mossloom" && s.id!=="velvetmoth"){horn(-0.2, 1.3, 0.6, 0.5);horn(0.2, 1.3, 0.6, 0.5);}
  }
  if (s.family === "shell") {
    body([0, 0.73, -0.1], [0.7 * bx, 0.55 * by, 0.75 * bz], dark);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      body([Math.sin(a) * 0.51 * bx, 0.85, Math.cos(a) * 0.51 * bz - 0.1], [0.24, 0.22, 0.24], i % 2 ? c : i % 3 ? light : accent);
    }
    headY = 0.65;
    headZ = 0.74;
    for (const x of [-0.55, 0.55]) for (const z of [-0.4, 0.4]) limb(x, z, 0.32);
  }
  if (s.family === "amphibian") {
    body([0, 0.62, -0.1], [0.61 * bx, 0.36 * by, 0.65 * bz]);
    body([0, 0.55, 0.08], [0.48 * bx, 0.26, 0.5], cream);
    headY = 0.8;
    headZ = 0.47;
    for (const side of [-1, 1]) {
      body([side * 0.5, 0.3, -0.45], [0.35, 0.25, 0.45], mid);
      limb(side * 0.36, 0.4, 0.35);
      body([side * 0.25, 1.08, 0.48], [0.18, 0.19, 0.18], light);
    }
    if (dna.marking !== "none")
      for (let i = 0; i < 4; i++) body([(i - 1.5) * 0.2, 0.92, -0.2 - (i % 2) * 0.15], [0.08, 0.04, 0.08], accent);
  }
  if (s.family === "serpent") {
    for (let i = 0; i < 9; i++) {
      const p = new T.Group();
      p.position.set(Math.sin(i * 0.8) * 0.35, 0.42 + i * 0.077, -1 + i * 0.2);
      rig.add(p);
      part(p, "orb", i % 2 ? c : dna.marking === "stripes" ? accent : mid, [0, 0, 0], [0.25 - i * 0.008, 0.24, 0.27]);
      tails.push(p);
    }
    headY = 1.16;
    headZ = 0.66;
    for (const side of [-1, 1]) horn(side * 0.2, 1.65, 0.63, 0.5);
  }
  if (s.family === "aquatic") {
    body([0, 0.9, 0], [0.44 * bx, 0.42 * by, 0.84 * bz]);
    body([0, 0.82, 0.12], [0.34 * bx, 0.3, 0.62 * bz], cream);
    headY = 0.99;
    headZ = 0.61;
    if (s.id !== "bloomanta" && s.id !== "cairnfin") { wing(-1, 1.15, accent); wing(1, 1.15, accent); }
    if (/jellyfish|cuttlefish/.test(s.appearance)) {
      body([0, 1.05, 0], [0.66, 0.42, 0.65]);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const l = new T.Group();
        l.position.set(Math.sin(a) * 0.3, 0.65, Math.cos(a) * 0.3);
        rig.add(l);
        part(l, "capsule", i % 2 ? light : accent, [0, -0.3, 0], [0.05, 0.32, 0.06], [0, 0, 0.2]);
        tails.push(l);
      }
    }
    if (s.id === "pelagryth") {
      body([0, 1.35, 0], [0.24, 0.55, 0.3]);
      headY = 1.8;
      headZ = 0.24;
    }
  }
  if (s.family === "spirit" && s.id !== "inkwisp") {
    body([0, 1, 0], [0.52 * bx, 0.6 * by, 0.44]);
    headY = 1.25;
    headZ = 0.27;
    for (const side of [-1, 1])
      part(rig, "cone", dark, [side * 0.4, 1.5, 0], [0.2, 0.65, 0.18], [0, 0, -side * 0.5]);
    for (let i = 0; i < 3; i++)
      body([Math.sin(i * 2) * 0.5, 0.5, Math.cos(i * 2) * 0.3], [0.12, 0.2, 0.13], i % 2 ? accent : light);
  }
  if (s.id === "inkwisp") { headY=1.26; headZ=.4; }
  if (s.family === "golem") {
    body([0, 1.1, 0], [0.73 * bx, 0.7, 0.45], dark);
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
    part(rig, "orb", accent, [0, 1.2, 0.43], [0.24, 0.32, 0.06], undefined, true);
  }
  if (s.id === "solmole") headY -= .1;
  // Head, ears, muzzle and a face with its own eyes.
  const hs = dna.head,
    headW = (s.family === "fox" ? 0.33 : 0.36) * hs;
  body([0, headY, headZ], [headW, 0.32 * hs, 0.34 * hs]);
  body([0, headY - 0.12 * hs, headZ + 0.1 * hs], [headW * 0.85, 0.2 * hs, 0.26 * hs], cream);
  if (dna.marking === "mask")
    body([0, headY + 0.06 * hs, headZ + 0.2 * hs], [headW * 0.9, 0.09 * hs, 0.2 * hs], dark);
  if (f.mane) {
    const leafy = /leaf/.test(s.appearance),
      cloudy = /cloud/.test(s.appearance);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        color = leafy ? (i % 2 ? "#8fc276" : "#6fa35f") : cloudy ? "#f4f6f8" : i % 2 ? accent : light;
      if (cloudy) body([Math.cos(a) * 0.4 * hs, headY + Math.sin(a) * 0.36 * hs, headZ - 0.18], [0.19, 0.19, 0.16], color);
      else {
        // Two layers: a bold outer fringe and a lighter inner one.
        part(rig, "cone", color, [Math.cos(a) * 0.4 * hs, headY + Math.sin(a) * 0.38 * hs, headZ - 0.24], [0.17, 0.58, 0.13], [0, 0, a - Math.PI / 2]);
        part(rig, "cone", leafy ? "#a9d58e" : light, [Math.cos(a + 0.26) * 0.3 * hs, headY + Math.sin(a + 0.26) * 0.28 * hs, headZ - 0.14], [0.11, 0.36, 0.1], [0, 0, a + 0.26 - Math.PI / 2]);
      }
    }
  }
  if (f.trunk)
    part(rig, "capsule", c, [0, headY - 0.32 * hs, headZ + 0.42 * hs], [0.09, 0.32, 0.09], [0.35, 0, 0]);
  if (f.mouthTusks) {
    for (const side of [-1, 1])
      part(rig, "cone", "#f3ecd9", [side * 0.16, headY - 0.3 * hs, headZ + 0.45 * hs], [0.06, 0.5, 0.06], [Math.PI / 2 + 0.6, 0, side * 0.25]);
  }
  if (f.snout) {
    body([0, headY - 0.12 * hs, headZ + 0.5 * hs], [0.22 * hs, 0.12 * hs, 0.42 * hs]);
    for (let k = 0; k < 4; k++)
      for (const side of [-1, 1])
        part(rig, "cone", "#fbf8ee", [side * 0.15 * hs, headY - 0.2 * hs, headZ + (0.3 + k * 0.14) * hs], [0.025, 0.07, 0.025], [Math.PI, 0, 0]);
  }
  if (f.ram)
    for (const side of [-1, 1])
      part(rig, "ring", accent, [side * 0.3 * hs, headY + 0.12 * hs, headZ - 0.05], [0.17 * hs, 0.17 * hs, 2.4], [0, Math.PI / 2, 0]);
  if (four) {
    const es = dna.earSize * hs,
      inner = tint(c, "#f6b8a8", 0.55);
    for (const side of [-1, 1]) {
      const ex = side * 0.22 * hs,
        ey = headY + 0.3 * hs;
      if (dna.ears === "pointed" || dna.ears === "tufted") {
        const tall = (s.family === "fox" ? 0.43 : 0.32) * es;
        part(rig, "cone", c, [ex, ey + tall * 0.12, headZ - 0.04], [0.16 * es, tall, 0.13], [0, 0, -side * 0.25]);
        part(rig, "cone", inner, [ex - side * 0.005, ey + tall * 0.07, headZ], [0.09 * es, tall * 0.7, 0.05], [0, 0, -side * 0.25]);
        if (dna.ears === "tufted")
          part(rig, "cone", dark, [ex + side * 0.06, ey + tall * 0.62, headZ - 0.04], [0.04, 0.16, 0.04], [0, 0, -side * 0.45]);
      } else if (dna.ears === "long") {
        part(rig, "capsule", c, [ex * 0.85, ey + 0.28 * es, headZ - 0.06], [0.1 * es, 0.26 * es, 0.07], [0.1, 0, -side * 0.12]);
        part(rig, "capsule", inner, [ex * 0.85, ey + 0.28 * es, headZ - 0.02], [0.05 * es, 0.2 * es, 0.03], [0.1, 0, -side * 0.12]);
      } else if (dna.ears === "round") {
        body([ex * 1.05, ey + 0.02, headZ - 0.05], [0.12 * es, 0.12 * es, 0.06]);
        body([ex * 1.05, ey + 0.02, headZ - 0.02], [0.07 * es, 0.07 * es, 0.03], inner);
      } else if (dna.ears === "floppy")
        part(rig, "capsule", dark, [ex * 1.25, ey - 0.1, headZ - 0.02], [0.09 * es, 0.2 * es, 0.06], [0.2, 0, -side * 0.9]);
    }
    body([0, headY - 0.1 * hs, headZ + 0.28 * hs], [0.22 * hs, 0.15 * hs, 0.25 * hs], cream);
    if (s.id !== "solmole") {
      part(rig, "orb", "#2a2422", [0, headY - 0.03 * hs, headZ + 0.5 * hs], [0.07, 0.055, 0.05], undefined, false, true);
      // A gentle "w" smile beneath the nose.
      if (!f.snout && !f.trunk && !f.mouthTusks) {
        part(rig, "capsule", "#5a3c34", [0, headY - 0.085 * hs, headZ + 0.515 * hs], [0.012, 0.03 * hs, 0.012]);
        for (const side of [-1, 1])
          part(rig, "arc", "#3a2622", [side * 0.04 * hs, headY - 0.118 * hs, headZ + 0.51 * hs], [0.042 * hs, 0.036 * hs, 0.05], [0.15, 0, Math.PI]);
      }
    }
    // Cheek tufts frame the face.
    if (furry)
      for (const side of [-1, 1])
        for (let k = 0; k < 2; k++)
          part(rig, "cone", k ? cream : c, [side * headW * (0.9 + k * 0.05), headY - (0.07 + k * 0.08) * hs, headZ + 0.04], [0.065 * hs, 0.17 * hs, 0.06], [0, 0, side * (Math.PI / 2 + 0.35 + k * 0.3)]);
  } else if (!f.snout && !f.trunk && s.family !== "bird" && s.id !== "inkwisp")
    // A small smile for everyone else without a beak.
    part(rig, "arc", "#3e2a28", [0, headY - 0.15 * hs, headZ + 0.345 * hs], [0.06 * hs, 0.045 * hs, 0.05], [0.25, 0, Math.PI]);
  for (const side of [-1, 1]) {
    const ex = side * 0.18 * hs,
      ey = headY + 0.05 * hs,
      ez = headZ + 0.27 * hs,
      es = dna.eye * hs,
      tilt = [0, 0, side * dna.slant];
    const eye = new T.Group(); eye.position.set(0, ey, 0); rig.add(eye); eyes.push(eye);
    // The iris, pupil and their shine sit in a "look" group so the eyes can glance about.
    const look = new T.Group(); eye.add(look); eye.userData.look = look;
    part(eye, "smooth", "#fffaf0", [ex, ey, ez], [0.1 * es, 0.115 * es, 0.07], tilt, false, true);
    // A dark rim around a brighter, lit-from-below iris gives the eye depth.
    part(look, "smooth", tint(dna.iris, "#0d1418", 0.55), [ex, ey - 0.005, ez + 0.04], [0.07 * es, 0.085 * es, 0.035], tilt, false, true);
    part(look, "smooth", dna.iris, [ex, ey - 0.005, ez + 0.045], [0.06 * es, 0.075 * es, 0.035], tilt, dna.glowEyes, true);
    part(look, "smooth", tint(dna.iris, "#ffffff", 0.45), [ex, ey - 0.035 * es, ez + 0.058], [0.04 * es, 0.03 * es, 0.025], tilt, dna.glowEyes, true);
    part(look, "smooth", "#0d1418", [ex, ey - 0.005, ez + 0.068], [0.034 * es, 0.046 * es, 0.02], tilt, false, true);
    part(look, "smooth", "#ffffff", [ex - side * 0.02, ey + 0.035 * es, ez + 0.084], [0.018 * es, 0.02 * es, 0.01], undefined, true);
    part(look, "smooth", "#ffffff", [ex + side * 0.022, ey - 0.03 * es, ez + 0.08], [0.008 * es, 0.009 * es, 0.006], undefined, true);
    // A soft upper lid, a shade deeper than the coat.
    part(eye, "smooth", tint(c, dark, 0.12), [ex, ey + 0.085 * es, ez - 0.004], [0.1 * es, 0.05 * es, 0.072], tilt);
    for (const p of [...eye.children, ...look.children]) if (p !== look) p.position.y -= ey;
    part(rig, "orb", blush, [side * 0.27 * hs, headY - 0.07 * hs, headZ + 0.2 * hs], [0.07, 0.04, 0.03]);
    // A soft brow gives strikers and shadows a determined look.
    if (dna.slant > 0.1)
      part(rig, "capsule", dark, [ex, ey + 0.13 * es, ez + 0.02], [0.025, 0.07, 0.02], [0, 0, Math.PI / 2 + side * 0.35]);
  }
  // Tails: each species' tail follows its description.
  const tailCount = ["reedrake","solmole","lumeswallow"].includes(s.id) ? 0 : s.id === "astralynx" ? 3 : ["fox", "quadruped", "dragon", "antler", "bird"].includes(s.family) ? f.tailCount : 0;
  for (let n = 0; n < tailCount; n++) {
    const tail = new T.Group(),
      spread = tailCount > 1 ? (n / (tailCount - 1) - 0.5) * (tailCount > 3 ? 2.2 : 1.1) : 0;
    tail.position.set(Math.sin(spread) * 0.12, 0.7 + lift, -0.65 * (four ? bz : 1));
    tail.rotation.set(tailCount > 3 ? -0.35 : 0, spread, 0);
    rig.add(tail);
    const t = dna.tail;
    if (t === "flame") {
      part(tail, "orb", c, [0.08, 0.18, -0.28], [0.17, 0.17, 0.42], [0.25, 0.2, 0]);
      part(tail, "cone", "#ffb04a", [0.14, 0.42, -0.58], [0.2, 0.55, 0.2], [Math.PI / 2 - 0.5, 0, 0], true);
      part(tail, "cone", "#fff1a8", [0.14, 0.42, -0.6], [0.1, 0.32, 0.1], [Math.PI / 2 - 0.5, 0, 0], true);
    } else if (t === "fin") {
      part(tail, "orb", c, [0, 0.12, -0.3], [0.17, 0.17, 0.42]);
      part(tail, "orb", accent, [0, 0.16, -0.72], [0.38, 0.06, 0.28], [0.2, 0, 0]);
    } else if (t === "leaf")
      for (let i = 0; i < 3; i++)
        part(tail, "orb", i === 1 ? accent : "#8fc276", [(i - 1) * 0.18, 0.25 + (i === 1 ? 0.08 : 0), -0.45 - (i === 1 ? 0.1 : 0)], [0.14, 0.05, 0.34], [0.4, (i - 1) * 0.5, 0]);
    else if (t === "cyclone")
      for (let i = 0; i < 3; i++)
        part(tail, "ring", i % 2 ? light : accent, [0, 0.25 + i * 0.12, -0.45 - i * 0.12], [0.24 - i * 0.05, 0.24 - i * 0.05, 0.5], [Math.PI / 2 + 0.3, 0, i], true);
    else if (t === "crystal")
      for (let i = 0; i < 3; i++)
        part(tail, "cone", i === 1 ? accent : light, [(i - 1) * 0.12, 0.3, -0.35 - i * 0.12], [0.08, 0.42, 0.08], [Math.PI / 2 - 0.4, 0, (i - 1) * 0.3], true);
    else if (t === "bolt")
      for (let i = 0; i < 3; i++)
        part(tail, "box", i % 2 ? accent : "#ffe27a", [i % 2 ? 0.08 : -0.04, 0.2 + i * 0.1, -0.25 - i * 0.2], [0.07, 0.24, 0.07], [0.6, 0, i % 2 ? -0.8 : 0.8], true);
    else if (t === "tuft") {
      part(tail, "capsule", c, [0, 0.12, -0.35], [0.06, 0.32, 0.06], [Math.PI / 2 - 0.4, 0, 0]);
      part(tail, "orb", dark, [0, 0.32, -0.66], [0.13, 0.13, 0.17]);
    } else if (t === "plume")
      for (let i = 0; i < 3; i++)
        part(tail, "orb", i === 2 ? accent : c, [(i - 1) * 0.1, 0.22 + i * 0.05, -0.4 - i * 0.08], [0.09, 0.05, 0.42], [0.35, (i - 1) * 0.35, 0]);
    else if (t === "stub") part(tail, "orb", cream, [0, 0.15, -0.12], [0.16, 0.16, 0.16]);
    else {
      part(tail, "orb", c, [0.1, 0.18, -0.3], [0.2 + s.variant * 0.025, 0.2, 0.5], [0.2, 0.2, 0]);
      part(tail, "cone", light, [0.18, 0.25, -0.7], [0.21, 0.5, 0.22], [Math.PI / 2 + 0.3, 0, 0]);
    }
    if (f.bigTail) {
      tail.scale.setScalar(1.55);
      tail.rotation.x = -0.7;
    }
    tails.push(tail);
  }
  // Signature anatomy is derived from the authored species description.
  if (s.id!=="mossloom" && /crown/.test(s.appearance)) {
    part(rig, "ring", light, [0, headY + 0.27 * hs, headZ - 0.02], [0.2 * hs, 0.2 * hs, 0.6], [Math.PI / 2 - 0.25, 0, 0], true);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(rig, "cone", light, [Math.sin(a) * 0.19 * hs, headY + 0.36 * hs, headZ - 0.02 + Math.cos(a) * 0.19 * hs], [0.045, 0.15, 0.045], undefined, true);
    }
  } else if (/halo|ring|orbit|sun-disc/.test(s.appearance))
    part(rig, "ring", light, [0, headY + 0.55 * hs, headZ - 0.1], [0.36 + s.variant * 0.04, 0.36 + s.variant * 0.04, 0.46], [0.3, 0, 0], true);
  if (s.id !== "solmole" && /crystal|ice|icicle|quill|plate|slate|stone|basalt/.test(s.appearance))
    for (let i = 0; i < 3 + s.variant; i++)
      part(rig, "cone", i % 2 ? light : accent, [(i % 2 ? 1 : -1) * 0.25, 1.02 + lift, -0.5 + i * 0.15], [0.12, 0.3 + (i % 3) * 0.08, 0.14], [0.3, 0, (i % 2 ? 1 : -1) * 0.4]);
  if (/leaf|fern|petal|flor|garden|canopy|bloom|sprout/.test(s.appearance))
    for (let i = 0; i < 3 + s.variant; i++) {
      const a = i * 2.4;
      part(rig, "orb", i % 2 ? accent : "#91c878", [Math.sin(a) * 0.32, 1.2 + lift + (i % 3) * 0.13, Math.cos(a) * 0.35 - 0.2], [0.15, 0.27, 0.06], [0.3, 0, a]);
    }
  if (/horn|tusk/.test(s.appearance) && !f.mouthTusks && s.family !== "antler" && s.id !== "solkarath" && s.id !== "reedrake")
    for (const side of [-1, 1]) horn(side * 0.3 * hs, headY + 0.36 * hs, headZ + 0.12, 0.4, rare ? accent : cream);
  if (/winged/i.test(s.appearance) && ["quadruped", "fox"].includes(s.family)) {
    wing(-1, 1.2);
    wing(1, 1.2);
  }
  // Rare species wear a ruff; mythic ones add a forehead gem and orbiting motes.
  if (rank === 4 && four && s.id !== "solmole")
    for (let i = 0; i < 8; i++) {
      const a = (i / 7 - 0.5) * 2.6;
      part(rig, "cone", i % 2 ? accent : light, [Math.sin(a) * 0.32, headY - 0.22 + Math.cos(a) * 0.08, headZ - 0.12], [0.1, 0.32, 0.1], [-1.25, 0, -a * 0.8]);
    }
  if (rank === 5) {
    part(rig, "orb", accent, [0, headY + 0.2 * hs, headZ + 0.3 * hs], [0.06, 0.08, 0.05], undefined, true);
    const aura = new T.Group();
    aura.position.set(0, headY - 0.2, headZ - 0.4);
    rig.add(aura);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      part(aura, "orb", i % 2 ? accent : light, [Math.cos(a) * 0.75, Math.sin(a * 2) * 0.15, Math.sin(a) * 0.75], [0.07, 0.07, 0.07], undefined, true);
    }
    tails.push(aura);
  }
  // Evolved forms wear a mane and a crest gem, so the bond's growth shows at a glance.
  if (evolved) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.4;
      part(rig, "cone", i % 2 ? light : c, [Math.sin(a) * 0.3, headY - 0.05 + Math.cos(a) * 0.12, headZ - 0.22], [0.11, 0.42, 0.11], [-1.1, 0, -a * 0.8]);
    }
    part(rig, "orb", tint(c, "#ffffff", 0.35), [0, headY + 0.3, headZ + 0.16], [0.075, 0.1, 0.06], undefined, true);
  }
  if (s.id === "ignivara")
    for (const side of [-1, 1]) {
      const rearWing = wing(side, 0.7);
      rearWing.position.z = -0.45;
      rearWing.position.y = 0.75 + lift;
    }
  if (s.id === "solkarath") {
    part(rig, "orb", "#ffe4a2", [0, headY + 0.22, headZ - 0.12], [0.18, 0.18, 0.18], [0, 0, 0], true);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        horn(side * (0.18 + i * 0.15), headY + 0.12 - i * 0.03, headZ - 0.02 - i * 0.15, 0.5);
  }
  if (s.id === "iskavelle") {
    limb(-0.35, 0, 0.65);
    limb(0.35, 0, 0.65);
  }
  if (s.id === "zephyreon")
    for (const side of [-1, 1])
      part(rig, "cone", light, [side * 0.3, 0.8 + lift, -1.2], [0.15, 0.9, 0.14], [Math.PI / 2, 0, side * 0.5]);
  // Named anatomy makes each western species readable even in silhouette.
  if (s.id === "reedlet") {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = side * (.36 + i * .08), y = headY + .07 + i * .09, z = headZ - i * .16;
      part(rig, "capsule", accent, [x, y, z], [.035, .27, .045], [0, 0, -side * .9]);
      for (let j = 0; j < 3; j++) part(rig, "orb", j % 2 ? blush : accent, [x + side * (.09 + j * .06), y + j * .045, z], [.1, .035, .07], [0, 0, side * .3]);
    }
    const paddle = new T.Group(); paddle.name = "reedlet-paddle"; paddle.position.set(0, .55, -.65); rig.add(paddle); tails.push(paddle);
    part(paddle, "orb", light, [0, .05, -.48], [.08, .27, .65]);
    part(paddle, "orb", accent, [0, .08, -.8], [.025, .2, .27]);
  }
  if (s.id === "lanternmoth" || s.id === "bloomanta") {
    const moth = s.id === "lanternmoth";
    for (const side of [-1, 1]) {
      const fin = new T.Group(); fin.name = moth ? "luna-wing" : "petal-fin"; fin.position.set(side * .24, moth ? .9 : 1, 0); rig.add(fin); wings.push(fin);
      part(fin, "orb", moth ? cream : accent, [side * .58, 0, -.03], [.8, .06, moth ? .62 : .85], [0, side * -.3, side * .12]);
      part(fin, "orb", moth ? accent : light, [side * .6, .065, .05], [.22, .015, .23]);
      part(fin, "orb", moth ? dark : cream, [side * .6, .082, .05], [.095, .015, .11]);
      if (moth) part(fin, "orb", light, [side * .78, 0, -.8], [.09, .035, .58], [0, side * .2, 0]);
      else {
        const ribbon = new T.Group(); ribbon.name = "bloomanta-ribbon"; ribbon.position.set(side * .2, .8, -.6); rig.add(ribbon); tails.push(ribbon);
        for (let j = 0; j < 4; j++) part(ribbon, "orb", j % 2 ? accent : cream, [side * j * .1, Math.sin(j) * .08, -.2 - j * .3], [.065, .025, .22], [0, -side * .25, 0]);
      }
    }
    if (moth) part(rig, "orb", accent, [0, .68, -.52], [.2, .2, .32], undefined, true);
    else for (let i = 0; i < 5; i++) part(rig, "orb", accent, [Math.cos(i * 1.26) * .22, headY + .32, headZ + Math.sin(i * 1.26) * .15], [.18, .045, .12], [0, i * 1.26, 0]);
  }
  if (s.id === "coppershell") {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, r = .48 - row * .13;
      part(rig, "box", row % 2 ? accent : dark, [Math.sin(a) * r, 1.1 + row * .12, -.1 + Math.cos(a) * r], [.25 - row * .03, .1, .25 - row * .03], [0, a, 0]);
    }
    part(rig, "orb", light, [0, headY - .11, headZ + .36], [.28, .08, .21]);
  }
  if (s.id === "galehart") {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        part(rig, "capsule", cream, [side * (.28 + i * .15), headY + .45 + i * .16, headZ - .1], [.045, .26, .045], [0, 0, -side * .7]);
        part(rig, "ring", "#d9be76", [side * (.34 + i * .15), headY + .26 + i * .16, headZ - .1], [.055, .09, .35], undefined, true);
      }
      for (const z of [-.38, .4]) part(rig, "ring", "#d9be76", [side * .29 * bx, .15, z * bz], [.14, .14, .5], [Math.PI / 2, 0, 0]);
    }
  }
  if (s.id === "auroroc") {
    const fan = new T.Group(); fan.name = "aurora-fan"; fan.position.set(0, 1.35, -.35); rig.add(fan); tails.push(fan);
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * .2;
      part(fan, "orb", [accent, "#72d8ca", dark][i % 3], [Math.sin(a) * .8, .25, -Math.cos(a) * .7], [.095, .055, .72], [-.35, -a, 0]);
      part(fan, "orb", light, [Math.sin(a) * 1.25, .52, -Math.cos(a) * 1.18], [.055, .025, .16], [-.35, -a, 0]);
    }
  }
  if (s.id === "cindervane") {
    for(const side of [-1,1]) {
      const blade=new T.Group();blade.name="cindervane-blade";blade.position.set(side*.36,.95,.3);rig.add(blade);limbs.push(blade);
      part(blade,"capsule",cream,[side*.28,.14,.12],[.09,.52,.09],[0,0,-side*.7]);
      part(blade,"cone",accent,[side*.49,.16,.48],[.13,.8,.16],[Math.PI*.35,0,side*.2]);
      for(let j=0;j<3;j++) part(blade,"cone",dark,[side*.49,.25+j*.07,.38+j*.16],[.065,.19,.08],[0,0,side*1.2]);
      const petals=new T.Group();petals.name="cindervane-petals";petals.position.set(side*.2,.85,-.2);rig.add(petals);wings.push(petals);
      for(let j=0;j<3;j++) part(petals,"orb",j%2?dark:cream,[side*(.28+j*.13),.02*j,-.15-j*.15],[.25,.035,.52],[0,-side*(.3+j*.2),side*.15]);
      part(rig,"cone",cream,[side*.25,headY+.26,headZ],[.13,.4,.1],[0,0,-side*.6]);
    }
  }
  if (s.id === "thermala") {
    for(let i=0;i<7;i++) {
      part(rig,"cone",i%2?accent:cream,[0,.72+Math.sin(i/6*Math.PI)*.16,.5-i*.25],[.11,.3+Math.sin(i/6*Math.PI)*.18,.16],[.2,0,0]);
      for(const side of [-1,1]) part(rig,"orb","#e6bd67",[side*.4,.67,.55-i*.21],[.07,.025,.05]);
    }
    const crescent=new T.Group();crescent.name="thermala-crescent";crescent.position.set(0,.4,-1.25);rig.add(crescent);tails.push(crescent);
    for(let i=0;i<7;i++) {const a=(i-3)*.27;part(crescent,"orb",i%2?light:cream,[Math.sin(a)*.5,0,-Math.cos(a)*.45],[.1,.06,.44],[0,-a,0]);}
  }

  if (s.id === "lumeswallow") {
    part(rig,"orb",accent,[0,headY-.19,headZ+.24],[.25,.12,.16]);
    for(const side of [-1,1]) {
      const fin=new T.Group();fin.name="lumeswallow-swept-wing";fin.position.set(side*.22,1,0);rig.add(fin);wings.push(fin);
      for(let i=0;i<4;i++) {
        part(fin,"orb",i===3?accent:mid,[side*(.3+i*.15),-.025*i,-.12-i*.12],[.18,.055,.48-i*.035],[0,-side*.45,side*.12]);
        part(fin,"orb",light,[side*(.3+i*.15),.025-.025*i,-.45-i*.12],[.105,.025,.12],[0,-side*.45,0]);
      }
      const tail=new T.Group();tail.name="lumeswallow-fork";tail.position.set(side*.1,.65,-.35);rig.add(tail);tails.push(tail);
      part(tail,"orb",mid,[side*.14,0,-.65],[.1,.055,.75],[0,-side*.22,0]);
      part(tail,"orb",accent,[side*.25,.015,-1.15],[.055,.025,.22],[0,-side*.22,0]);
    }
  }
  if (s.id === "velvetmoth") {
    for(const side of [-1,1]) {
      const fin=new T.Group();fin.name="velvetmoth-eyespot-wing";fin.position.set(side*.2,.92,-.05);rig.add(fin);wings.push(fin);
      part(fin,"orb",dark,[side*.55,0,.05],[.75,.065,.58],[0,-side*.25,side*.13]);
      part(fin,"orb",mid,[side*.45,-.01,-.62],[.54,.06,.43],[0,side*.3,0]);
      for(let i=0;i<5;i++) part(fin,"orb",light,[side*(.48+Math.sin(i*.65)*.58),.01,.43-i*.23],[.16,.045,.14]);
      part(fin,"orb",accent,[side*.56,.075,.05],[.24,.025,.23]);
      part(fin,"orb",dark,[side*.56,.105,.05],[.13,.025,.14]);
      part(fin,"orb",light,[side*.55,.13,.08],[.045,.02,.055],undefined,true);
      const ant=new T.Group();ant.name="velvetmoth-feather-antenna";ant.position.set(side*.15,headY+.2,headZ);rig.add(ant);
      part(ant,"capsule",cream,[side*.1,.2,0],[.025,.45,.025],[0,0,-side*.4]);
      for(let i=0;i<4;i++) part(ant,"orb",light,[side*(.05+i*.045),.08+i*.09,0],[.13,.02,.045],[0,0,-side*.2]);
    }
  }
  if (s.id === "reedrake") {
    for(const side of [-1,1]) {
      const web=new T.Group();web.name="reedrake-webwing";web.position.set(side*.25,.95,-.15);rig.add(web);wings.push(web);
      for(let i=0;i<3;i++) {
        part(web,"orb",i%2?light:accent,[side*(.34+i*.18),.1-i*.04,-i*.23],[.38,.055,.3],[0,side*.3,side*.2]);
        part(web,"capsule",cream,[side*(.3+i*.15),.12,-i*.2],[.035,.27,.035],[0,0,side*1.2]);
      }
      const reed=new T.Group();reed.name="reedrake-cattail";reed.position.set(side*.22,headY+.2,headZ-.15);rig.add(reed);
      part(reed,"capsule",mid,[side*.04,.22,0],[.045,.25,.045],[0,0,-side*.25]);
      part(reed,"capsule",dna.iris,[side*.1,.46,0],[.08,.14,.08],[0,0,-side*.25]);
    }
    const paddle=new T.Group();paddle.name="reedrake-paddle";paddle.position.set(0,.65,-.8);rig.add(paddle);tails.push(paddle);
    part(paddle,"orb",mid,[0,0,-.32],[.14,.12,.4]);
    part(paddle,"orb",light,[0,.02,-.65],[.38,.06,.27]);
    for(const side of [-1,1])part(paddle,"orb",accent,[side*.18,.06,-.65],[.13,.025,.18]);
  }
  if (s.id === "solmole") {
    for(const side of [-1,1]) {
      const paw=new T.Group();paw.name="solmole-spade";paw.position.set(side*.5,.27,.55);rig.add(paw);
      part(paw,"orb",accent,[0,0,0],[.26,.11,.23]);
      for(let i=0;i<3;i++)part(paw,"cone",cream,[(i-1)*.12,0,.22],[.065,.24,.06],[Math.PI/2,0,0]);
    }
    for(let i=0;i<3;i++) {
      const lantern=new T.Group();lantern.name="solmole-lantern";lantern.position.set(0,.94,-.47+i*.28);rig.add(lantern);
      part(lantern,"orb",accent,[0,0,0],[.22,.22,.18],undefined,true);
      part(lantern,"ring",dark,[0,0,0],[.22,.22,.8],[Math.PI/2,0,0]);
    }
    const nose=new T.Group();nose.name="solmole-star-nose";nose.position.set(0,headY-.03*hs,headZ+.5*hs+.025);rig.add(nose);
    part(nose,"orb","#eaa09c",[0,0,0],[.085,.07,.045]);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;part(nose,"orb","#eaa09c",[Math.cos(a)*.09,Math.sin(a)*.075,.005],[.065,.027,.035],[0,0,a]);}
    const tail=new T.Group();tail.name="solmole-short-tail";tail.position.set(0,.38,-.7);rig.add(tail);tails.push(tail);
    part(tail,"capsule",light,[0,.02,-.18],[.055,.2,.055],[Math.PI/2,0,0]);
  }
  if (s.id === "cairnfin") {
    for (const side of [-1,1]) {
      const fin=new T.Group();fin.name="cairnfin-stone-fin";fin.position.set(side*.25,.9,-.1);rig.add(fin);wings.push(fin);
      for(let i=0;i<3;i++)part(fin,"orb",[mid,c,light][i],[side*(.35+i*.25),-.015*i,-.15*i],[.65-i*.12,.09,.65-i*.1],[0,side*.4,side*.1]);
      for(let i=0;i<3;i++)part(rig,"cone",accent,[side*(.15+i*.15),1.15-i*.035,-.15-i*.19],[.09,.22,.09],[0,0,side*.2],true);
    }
    const ribbon=new T.Group();ribbon.name="cairnfin-ribbon";ribbon.position.set(0,.85,-.85);rig.add(ribbon);tails.push(ribbon);
    for(let i=0;i<5;i++)part(ribbon,"orb",i%2?light:mid,[Math.sin(i*.65)*.12,-i*.035,-i*.2],[.075,.04,.19]);
  }
  if (s.id === "inkwisp") {
    body([0,1.25,0],[.66,.38,.55],light);
    body([0,1.08,0],[.64,.11,.54],c);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,t=new T.Group();t.name="inkwisp-tentacle";t.position.set(Math.cos(a)*.37,.97,Math.sin(a)*.32);rig.add(t);tails.push(t);
      for(let j=0;j<4;j++)part(t,"orb",j%2?accent:c,[Math.sin(j*.7+a)*.07,-j*.16,0],[.055,.14,.055]);
      part(rig,"box",dna.iris,[Math.cos(a)*.77,1.85,Math.sin(a)*.63],[.08,.16,.035],[0,-a,.3],true);
    }
    part(rig,"ring",accent,[0,1.82,0],[.77,.63,1],[Math.PI/2,0,0],true);
  }
  if (s.id === "mossloom") {
    part(rig,"orb",accent,[0,.8,-.5],[.6,.48,.6]);
    for(let i=0;i<4;i++) part(rig,"ring",cream,[0,.85,-.5],[.2+i*.1,.2+i*.1,.22],[Math.PI/2,0,i*.2]);
    for(const l of limbs){
      const side=Math.sign(l.position.x);
      const points=[new T.Vector3(0,0,0),new T.Vector3(side*.48,.08,l.position.z*.3),new T.Vector3(side*.68,-.5,l.position.z*.4)];
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],delta=b.clone().sub(a),midpoint=a.clone().add(b).multiplyScalar(.5);
        const segment=part(l,"capsule",i===1?"#ddb56e":light,midpoint.toArray(),[.11,delta.length()/2,.11]);
        segment.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
      }
      part(l,"orb",accent,points[1].toArray(),[.09,.09,.09]);
    }
    for(let i=0;i<3;i++) part(rig,"orb",light,[(i-1)*.13,headY+.27,headZ-.04],[.08,.06,.23],[.3,0,(i-1)*.5]);
  }
  if (s.id === "astralynx") {
    for(const side of [-1,1]) {
      part(rig,"cone",accent,[side*.26,headY+.65,headZ-.03],[.055,.45,.065],[0,0,-side*.3]);
      for(let i=0;i<4;i++) part(rig,"orb",cream,[side*.43,.97,.4-i*.25],[.065,.055,.07],undefined,true);
    }
    tails.forEach((t,i)=>{
      part(t,"ring",i%2?"#ba9de5":"#8de3d1",[.18,.28,-.65],[.17,.17,.4],[.4,0,0],true);
      part(t,"orb",cream,[.18,.33,-.9],[.1,.07,.27],[.2,0,0]);
    });
  }
  if(s.id==="sunquill") {
    for(let i=0;i<5;i++)part(rig,"cone",accent,[(i-2)*.09,headY+.42+Math.sin(i/4*Math.PI)*.15,headZ-.08],[.07,.38,.08],[0,0,(i-2)*-.12]);
    for(const side of [-1,1])part(rig,"ring",accent,[side*.44,1.1,0],[.24,.24,.5],[0,Math.PI/2,0],true);
  }
  if(s.id==="bramblebun") {
    for(const side of [-1,1])for(let i=0;i<3;i++)part(rig,"orb",accent,[side*(.3+i*.06),.95-i*.08,-.35],[.1,.1,.1]);
    part(rig,"orb",cream,[0,.6,-.8],[.28,.28,.28]);
  }
  if(s.id==="kilnback") {
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      part(rig,"box",accent,[Math.cos(a)*.43,1.12,Math.sin(a)*.43],[.24,.12,.24],[0,a,0]);
      part(rig,"orb","#ffd078",[Math.cos(a)*.45,1.2,Math.sin(a)*.45],[.07,.025,.12],undefined,true);
    }
  }
  if(s.id==="frostmoth") {
    for(const side of [-1,1]){
      const wing=new T.Group();wing.name="frostmoth-icewing";wing.position.set(side*.2,.95,-.1);rig.add(wing);wings.push(wing);
      for(let j=0;j<2;j++){
        part(wing,"orb",j?accent:light,[side*(.55+j*.15),.08-j*.2,.22-j*.6],[.66,.055,.48],[0,side*(.4-j*.8),side*.1]);
        part(wing,"orb",dark,[side*(.65+j*.15),.14-j*.2,.22-j*.6],[.16,.03,.16]);
        part(wing,"orb",cream,[side*(.65+j*.15),.17-j*.2,.22-j*.6],[.07,.02,.07],undefined,true);
      }
    }
  }
  tails.forEach((t) => { t.userData.restRotation = t.rotation.clone(); });
  consolidate(rig, `creature:${id}:${shimmer ? "shimmer" : "normal"}`);
  const glints = new T.Group();
  if (shimmer) {
    glints.name = "shimmer-glints";
    glints.position.y = headY * 0.65;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      part(glints, "orb", "#fff1ba", [Math.cos(a) * 0.8, (i - 1) * 0.3, Math.sin(a) * 0.8], [0.035, 0.075, 0.035], undefined, true);
    }
    rig.add(glints);
  }
  g.scale.setScalar(s.size);
  g.userData = { shimmer, glints, rig, limbs, wings, tails, eyes, family: s.family, index: s.index, headAt: [headY, headZ] };
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
  | "stunned"
  | "sleep"
  | "play";
export function animateCreature(
  g: T.Group,
  time: number,
  state: Motion = "idle",
  phase = 0,
  reduced = false,
) {
  const { rig, limbs, wings, tails, family, index, glints, eyes } = g.userData;
  if (glints && g.userData.shimmer) {
    glints.rotation.y = reduced ? 0 : time * 0.45;
    glints.scale.setScalar(reduced ? 1 : 0.92 + Math.sin(time * 2) * 0.08);
  }
  const floating = ["bird", "aquatic", "spirit"].includes(family),
    speed = 2 + (index % 4) * 0.3;
  const motion = reduced ? 0.2 : 1;
  rig.position.set(0, (floating ? 0.15 : 0) + Math.sin(time * speed) * 0.035 * motion, 0);
  const blinkPhase = (time + index * .37) % 4.7;
  const blink = state === "sleep" ? .07 : reduced ? 1 : blinkPhase > 4.5 ? Math.max(.07, Math.abs(blinkPhase - 4.6) * 10) : 1;
  // Every couple of seconds the eyes dart to a new spot, then hold it.
  const glance = (time + index * 0.61) / 2.3,
    spot = (n: number, k: number) => ((Math.sin(n * 12.9898 + k * 78.233 + index) * 43758.5453) % 1) * 0.5,
    n = Math.floor(glance),
    t = Math.min(1, (glance - n) * 19),
    still = reduced || !["idle", "walk", "play", "victory"].includes(state),
    lookX = still ? 0 : spot(n - 1, 0) + (spot(n, 0) - spot(n - 1, 0)) * t,
    lookY = still ? 0 : spot(n - 1, 1) + (spot(n, 1) - spot(n - 1, 1)) * t;
  eyes?.forEach((eye: T.Group) => {
    eye.scale.y = blink;
    eye.userData.look?.position.set(lookX * 0.036, lookY * 0.022, 0);
  });
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
    t.rotation.y = (t.userData.restRotation?.y || 0) + Math.sin(time * 2 + i * 0.7) * 0.22 * motion;
    t.rotation.x = (t.userData.restRotation?.x || 0) + Math.sin(time * 2 + i) * 0.08 * motion;
  });
  if (state === "walk") {
    if (family === "amphibian") rig.position.y += Math.abs(Math.sin(time * 5)) * .16 * motion;
    if (family === "shell") rig.rotation.z = Math.sin(time * 5) * .07 * motion;
    if (family === "aquatic") rig.rotation.y = Math.sin(time * 3) * .18 * motion;
  }
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
  if (state === "sleep") {
    // Curled low with slow, deep breaths and a tucked, still tail.
    rig.position.y = (floating ? 0.05 : -0.05) + Math.sin(time * 1.2) * 0.02 * motion;
    rig.scale.set(1.04, 0.86 + Math.sin(time * 1.2) * 0.03 * motion, 1);
    rig.rotation.x = 0.12;
    limbs.forEach((l: T.Group) => (l.rotation.x = 0));
    tails.forEach((t: T.Group) => (t.rotation.y = 0.5));
    wings.forEach((w: T.Group, i: number) => (w.rotation.z = ((i % 2) * 2 - 1) * -0.1));
  }
  if (state === "play") {
    // Playful pounces: a crouch, a hop and a happy tilt.
    const hop = Math.max(0, Math.sin(time * 5));
    rig.position.y += hop * 0.28 * motion;
    rig.rotation.z = Math.sin(time * 2.5) * 0.18 * motion;
    rig.rotation.x = -hop * 0.2 * motion;
  }
}

// Keepers: rounded proportions, faces with brows and smiles, and per-character hair.
const PANTS = ["#3b4f57", "#33454d", "#4d5a3f", "#3e566b", "#4a4f52", "#3d3446", "#6b6455", "#2f3a46"];
const IRIS = ["#4a3020", "#2c5f63", "#5a7a3a", "#3f6f9a", "#3a2a20", "#6a4a80", "#7a5a2a", "#2a3a4a"];
export function createAvatar(index: number) {
  const a = AVATARS[index],
    g = new T.Group(),
    limbs: T.Group[] = [],
    eyes: T.Group[] = [];
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
    // A turned-up trouser cuff, and a rounded boot on a slim darker sole.
    part(leg, "band", tint(pants, "#ffffff", 0.07), [0, -0.6, 0], [0.08, 0.035, 0.083]);
    part(leg, "orb", shoe, [0, -0.69, 0.04], [0.085, 0.075, 0.14]);
    part(leg, "box", "#3e2e24", [0, -0.75, 0.045], [0.15, 0.03, 0.26]);
    limbs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * (w + 0.045), 1.3, 0);
    g.add(arm);
    part(arm, "capsule", a.coat, [side * 0.015, -0.2, 0], [0.11, 0.21, 0.11], [0, 0, side * 0.08]);
    // Sleeve cuff, then a mitten hand with its thumb toward the front.
    part(arm, "band", tint(a.coat, "#ffffff", 0.25), [side * 0.028, -0.385, 0], [0.06, 0.05, 0.06], [0, 0, side * 0.08]);
    part(arm, "orb", a.skin, [side * 0.032, -0.45, 0.005], [0.055, 0.07, 0.048]);
    part(arm, "orb", a.skin, [side * 0.004, -0.43, 0.04], [0.024, 0.036, 0.024], [0.3, 0, -side * 0.4]);
    limbs.push(arm);
  }
  // Torso, coat hem, belt and backpack.
  part(g, "orb", pants, [0, 0.84, 0], [w * 0.95, 0.13, 0.17]);
  part(g, "capsule", a.coat, [0, 1.12, 0], [w * 2, 0.22, 0.34]);
  part(g, "cone", a.coat, [0, 0.95, 0], [w * 1.08, 0.36, 0.2]);
  // Squared shoulders that the sleeves grow out of.
  part(g, "orb", a.coat, [0, 1.26, 0], [w * 1.12, 0.1, 0.165]);
  for (const side of [-1, 1]) part(g, "orb", a.coat, [side * (w + 0.015), 1.27, 0], [0.085, 0.085, 0.1]);
  // A button placket down the front.
  for (let k = 0; k < 3; k++)
    part(g, "orb", tint(a.coat, "#2a1e18", 0.45), [0, 1.2 - k * 0.1, 0.168 - k * 0.004], [0.017, 0.017, 0.01], undefined, false, true);
  // Belt hugging the waist, with its buckle on the front.
  part(g, "band", "#4c4038", [0, 0.88, 0], [w * 0.92, 0.06, 0.175]);
  part(g, "box", "#e0c680", [0.06, 0.88, 0.176], [0.07, 0.05, 0.02], undefined, false, true);
  part(g, "box", "#a57951", [0, 1.12, -0.22], [0.32, 0.4, 0.15]);
  part(g, "capsule", "#c9b38a", [0, 1.36, -0.22], [0.09, 0.15, 0.09], [0, 0, Math.PI / 2]);
  // A shirt collar: a neckband with two folded points at the front.
  const collar = index % 2 ? "#d9b479" : "#c5d6b6";
  part(g, "band", collar, [0, 1.37, 0], [0.105, 0.045, 0.1]);
  for (const side of [-1, 1])
    part(g, "box", collar, [side * 0.045, 1.345, 0.1], [0.075, 0.05, 0.016], [-0.35, 0, side * 0.7]);
  // Neck and head.
  part(g, "capsule", a.skin, [0, 1.42, 0], [0.09, 0.05, 0.09]);
  const head = new T.Group();
  head.position.set(0, 1.62, 0);
  g.add(head);
  part(head, "orb", a.skin, [0, 0, 0], [0.2, 0.225, 0.2]);
  for (const side of [-1, 1]) {
    part(head, "orb", a.skin, [side * 0.195, -0.01, -0.01], [0.04, 0.055, 0.035]);
    // Each eye is its own group so it can blink.
    const eye = new T.Group();
    eye.position.set(side * 0.072, 0.015, 0);
    head.add(eye);
    eyes.push(eye);
    part(eye, "smooth", "#fffaf2", [0, 0, 0.172], [0.04, 0.042, 0.02], undefined, false, true);
    part(eye, "smooth", tint(IRIS[index], "#000000", 0.45), [0, -0.003, 0.184], [0.028, 0.032, 0.012], undefined, false, true);
    part(eye, "smooth", IRIS[index], [0, -0.004, 0.186], [0.023, 0.027, 0.012], undefined, false, true);
    part(eye, "smooth", "#0b1013", [0, -0.003, 0.193], [0.012, 0.015, 0.008], undefined, false, true);
    part(eye, "smooth", "#ffffff", [-side * 0.006, 0.009, 0.199], [0.006, 0.007, 0.004], undefined, true);
    // Lashes along the upper lid, flicked out at the corner.
    part(eye, "arc", "#24170f", [0, 0.002, 0.184], [0.042, 0.04, 0.03], [-0.25, 0, 0]);
    part(eye, "capsule", "#24170f", [side * 0.043, 0.012, 0.176], [0.006, 0.014, 0.006], [0, 0, -side * 1]);
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
  g.userData = { limbs, index, head, eyes };
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
  // Soft fringe locks over the forehead, swept to one side.
  if (index !== 0 && index !== 6)
    for (let i = 0; i < 4; i++)
      part(head, "capsule", color, [(i - 1.5) * 0.06, 0.135 - Math.abs(i - 1.5) * 0.012, 0.155 - Math.abs(i - 1.5) * 0.02], [0.05, 0.06, 0.035], [-0.45, 0, 0.35 + (i - 1.5) * 0.12]);
  // A glossy highlight band across the crown.
  part(head, "arc", tint(color, "#ffffff", 0.28), [0, 0.11, 0.035], [0.17, 0.13, 0.17], [-1.05, 0, 0], false, true);
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
  // A quick blink every few seconds, offset per keeper.
  const blink = (t + g.userData.index * 0.83) % 3.9;
  g.userData.eyes?.forEach((e: T.Group) => {
    e.scale.y = reduced || blink < 3.75 ? 1 : Math.max(0.1, Math.abs(blink - 3.825) * 13);
  });
  const head = g.userData.head as T.Group | undefined;
  if (head) {
    head.rotation.y = walk || reduced ? 0 : Math.sin(t * 0.7 + g.userData.index) * 0.18;
    head.rotation.x = walk ? 0.05 : Math.sin(t * 0.9 + g.userData.index) * 0.04;
  }
  // The walking bob rides on top of whatever ground the keeper stands on.
  g.position.y =
    (g.userData.groundY || 0) +
    (walk
      ? Math.abs(Math.sin(t * 8)) * 0.035
      : Math.sin(t * 2) * 0.008 * (reduced ? 0.2 : 1));
}

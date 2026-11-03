import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { ALL_SPECIES } from "../packages/shared/content";
import { animateAvatar, animateCreature, createAvatar, createCreature, watchKeeper } from "../apps/client/src/models";
import { worldFocus } from "../apps/client/src/village-materials";

const meshes = (o: Object3D) => {
  const out: Mesh[] = [];
  o.traverse((c) => c instanceof Mesh && out.push(c));
  return out;
};
// Pupils are the near-black glossy parts inside each eye's glance group.
const pupils = (id: string) =>
  createCreature(id).userData.eyes.flatMap((eye: Object3D) =>
    meshes(eye.userData.look).filter((m) => (m.material as MeshStandardMaterial).color.getHexString() === "0d1418"),
  ) as Mesh[];

describe("creature looks", () => {
  it("gives dragons and serpents slit pupils and everyone else round ones", () => {
    for (const s of ALL_SPECIES) {
      const p = pupils(s.id);
      expect(p, s.id).toHaveLength(2);
      const ratio = p[0].scale.x / p[0].scale.y;
      if (s.family === "dragon" || s.family === "serpent") expect(ratio, s.id).toBeLessThan(0.3);
      else expect(ratio, s.id).toBeGreaterThan(0.6);
    }
  });

  it("crowns only evolved forms with a circlet that turns, and holds it still under Reduced Motion", () => {
    for (const s of ALL_SPECIES) {
      const model = createCreature(s.id);
      expect(model.getObjectsByProperty("name", "bond-circlet"), s.id).toHaveLength(s.evolvedFrom ? 1 : 0);
    }
    const evolved = createCreature("pyrevale");
    animateCreature(evolved, 3, "idle");
    expect(evolved.userData.crest.circlet.rotation.y).toBeCloseTo(2.4);
    animateCreature(evolved, 3, "idle", 0, true);
    expect(evolved.userData.crest.circlet.rotation.y).toBe(0);
  });

  it("lets light through lantern and frost moth wings but keeps velvet opaque", () => {
    const see = (id: string) =>
      meshes(createCreature(id)).filter((m) => {
        const mat = m.material as MeshStandardMaterial;
        return mat.transparent && mat.opacity < 1 && !mat.depthWrite && !(mat instanceof MeshBasicMaterial);
      }).length;
    expect(see("lanternmoth")).toBeGreaterThanOrEqual(2);
    expect(see("frostmoth")).toBeGreaterThanOrEqual(4);
    expect(see("velvetmoth")).toBe(0);
  });

  it("twinkles shimmer stars in turn", () => {
    const model = createCreature("emberfox", true);
    animateCreature(model, 1.1, "idle");
    const sizes = model.userData.glints.children.map((s: Object3D) => s.scale.x);
    expect(new Set(sizes.map((v: number) => v.toFixed(3))).size).toBeGreaterThan(1);
  });

  it("slithers serpents while walking and straightens them again at rest", () => {
    const model = createCreature("coralisk"),
      segments = model.userData.tails.filter((t: Object3D) => t.userData.slither);
    expect(segments).toHaveLength(9);
    const rest = segments.map((t: Object3D) => t.position.x);
    animateCreature(model, 1.3, "walk");
    expect(segments.some((t: Object3D, i: number) => Math.abs(t.position.x - rest[i]) > 0.03)).toBe(true);
    animateCreature(model, 1.3, "idle");
    expect(segments.map((t: Object3D) => t.position.x)).toEqual(rest);
  });

  it("knocks back a hit creature and topples a defeated one with closed eyes", () => {
    const model = createCreature("emberfox");
    animateCreature(model, 1, "hit", 0.6);
    expect(model.userData.rig.position.z).toBeLessThan(0);
    animateCreature(model, 1, "defeat", 2);
    expect(model.userData.rig.rotation.z).toBeCloseTo(1.15);
    expect(model.userData.eyes.every((e: Object3D) => e.scale.y < 0.1)).toBe(true);
  });
});

it("drops an arriving creature in from above and lands it at full size", () => {
  const model = createCreature("emberfox");
  animateCreature(model, 0, "entrance", 0.05);
  expect(model.userData.rig.position.y).toBeGreaterThan(1);
  animateCreature(model, 0, "entrance", 1);
  expect(model.userData.rig.position.y).toBeLessThan(0.05);
  expect(model.userData.rig.scale.y).toBeCloseTo(1);
});

it("droops a weary creature with heavy-lidded eyes", () => {
  const model = createCreature("emberfox");
  animateCreature(model, 1, "weary");
  expect(model.userData.rig.rotation.x).toBeCloseTo(0.14);
  expect(model.userData.eyes.every((e: Object3D) => e.scale.y <= 0.55)).toBe(true);
});

it("lets the scene set a gaze, which only applies while the creature is free to glance", () => {
  const model = createCreature("emberfox");
  model.userData.gaze = { x: 0, y: 0.5 };
  animateCreature(model, 1, "idle");
  expect(model.userData.eyes[0].userData.look.position.y).toBeCloseTo(0.5 * 0.022);
  animateCreature(model, 1, "attack", 0.5);
  expect(model.userData.eyes[0].userData.look.position.y).toBe(0);
});

it("wags a celebrating creature's tail hard, but not under Reduced Motion", () => {
  const model = createCreature("emberfox"),
    tail = model.userData.tails[0],
    swing = (state: "victory" | "idle", reduced = false) => {
      const at = [0, 0.05, 0.1, 0.15].map((time) => (animateCreature(model, time + 1, state, 0, reduced), tail.rotation.y));
      return Math.max(...at) - Math.min(...at);
    };
  expect(swing("victory")).toBeGreaterThan(swing("idle") + 0.2);
  expect(swing("victory", true)).toBeLessThan(0.2);
});

it("shakes a wet creature hard at first and settles by the end", () => {
  const model = createCreature("emberfox"),
    roll = (phase: number) => (animateCreature(model, 1, "shake", phase), Math.abs(model.userData.rig.rotation.z));
  expect(Math.max(roll(0.04), roll(0.12))).toBeGreaterThan(0.15);
  expect(roll(1)).toBeLessThan(0.01);
});

it("puffs Z's only while a creature sleeps", () => {
  const model = createCreature("mossprig");
  animateCreature(model, 2, "sleep");
  expect(model.getObjectByName("sleep-zzz")?.visible).toBe(true);
  animateCreature(model, 3, "idle");
  expect(model.getObjectByName("sleep-zzz")?.visible).toBe(false);
});

it("dyes a keeper's hair without touching the cached natural look", () => {
  const colors = (m: Object3D) => meshes(m).flatMap((x) => Array.from((x.geometry.attributes.color?.array || []) as ArrayLike<number>));
  const natural = colors(createAvatar(1)),
    dyed = colors(createAvatar(1, "#3f6f9a"));
  expect(dyed).not.toEqual(natural);
  expect(colors(createAvatar(1))).toEqual(natural);
});

describe("keeper habits", () => {
  it("falls into a personal habit while idle, but not while walking or under Reduced Motion", () => {
    const dax = createAvatar(4),
      [, leftArm] = dax.userData.limbs as Object3D[],
      at = 18 + 1.3 - 4 * 2.3;
    animateAvatar(dax, at);
    expect(leftArm.rotation.x).toBeLessThan(-0.5);
    animateAvatar(dax, at, false, false, true);
    expect(leftArm.rotation.x).toBeGreaterThan(-0.1);
    animateAvatar(dax, at, true);
    expect(Math.abs(leftArm.rotation.z)).toBe(0);
  });
});

describe("villagers who watch the keeper", () => {
  it("turn their heads toward a keeper close by, and only when marked", () => {
    worldFocus.set(3, 0, 0.2);
    const host = watchKeeper(createAvatar(2)),
      other = createAvatar(2);
    for (let i = 0; i < 80; i++) {
      animateAvatar(host, i / 30);
      animateAvatar(other, i / 30);
    }
    expect(host.userData.head.rotation.y).toBeGreaterThan(0.9);
    expect(Math.abs(other.userData.head.rotation.y)).toBeLessThan(0.2);
    worldFocus.set(30, 0, 0);
    for (let i = 0; i < 80; i++) animateAvatar(host, i / 30);
    expect(Math.abs(host.userData.head.rotation.y)).toBeLessThan(0.2);
    worldFocus.set(0, 0, 5);
  });

  it("let the keeper glance at a point, and look away while paused", () => {
    const keeper = createAvatar(0),
      pet = new Vector3(-2, 0, 0.5);
    keeper.userData.watch = pet;
    for (let i = 0; i < 80; i++) animateAvatar(keeper, i / 30);
    expect(keeper.userData.head.rotation.y).toBeLessThan(-0.9);
    expect(keeper.userData.head.rotation.x).toBeGreaterThan(0.1);
    keeper.userData.watchPaused = true;
    for (let i = 0; i < 80; i++) animateAvatar(keeper, i / 30);
    expect(Math.abs(keeper.userData.head.rotation.y)).toBeLessThan(0.2);
  });
});

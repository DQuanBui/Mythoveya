import { CONSERVANCY_PATHS } from "./conservancy";
import { RALLY_PATHS } from "./rally";
import { PEBBLES, type Point } from "./haven";
import type { Profile } from "./types";

export const HOLLOW_EXTENT = 52;
export const HOLLOW_LAKE = { x: -23, z: 12, rx: 8, rz: 5 };
export const HOLLOW_WORKSHOP: Point = [19, 12];
export const HOLLOW_PATHS: Point[][] = [
  ...CONSERVANCY_PATHS.hollow,
  ...RALLY_PATHS.hollow,
  [
    [0, 5],
    [0, 12],
    [-10, 20],
    [-24, 25],
    [-35, 18],
    [-35, 8],
    [-32, -4],
    [-24, -10],
    [-16, -23],
    [0, -27],
    [13, -25],
    [25, -18],
    [28, 4],
    [29, 23],
    [12, 23],
    [12, 12],
    [19, 12],
    [0, 12],
  ],
  [
    [0, -9],
    [-14, -8],
    [-16, -23],
  ],
];
export const HOLLOW_MOUNTAINS = [
  [-39, -18, 3, 8],
  [-26, -32, 3, 10],
  [20, -34, 3, 9],
  [37, -18, 3, 7],
];
export const HOLLOW_BUILDINGS = [
  { x: 19, z: 17, width: 4.4, depth: 4, roof: "#69758e" },
  { x: 0, z: -33, width: 6, depth: 4, roof: "#8677a5" },
  { x: 33, z: 25, width: 3.5, depth: 3, roof: "#597f87" },
];
export function hollowEdge(a: number) {
  return 45 + 2 * Math.sin(a * 4) + Math.cos(a * 7);
}
const smooth = (n: number) => {
  n = Math.max(0, Math.min(1, n));
  return n * n * (3 - 2 * n);
};
export function hollowHeight(x: number, z: number) {
  if (
    Math.hypot(
      (x - HOLLOW_LAKE.x) / HOLLOW_LAKE.rx,
      (z - HOLLOW_LAKE.z) / HOLLOW_LAKE.rz,
    ) < 1
  )
    return -0.7;
  const natural = 6 * smooth((-z - 14) / 20);
  const d = Math.max(0, Math.abs(x) - 3.3, Math.abs(z + 33) - 2.3);
  return 6 + (natural - 6) * smooth(d / 2);
}
export function hollowPathDistance(x: number, z: number) {
  let d = Infinity;
  for (const path of HOLLOW_PATHS)
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        dx = bx - ax,
        dz = bz - az;
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
      d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
  return d;
}
export const HOLLOW_GATHER = [
  {
    id: "glass",
    name: "Frostglass shelf",
    point: [-24, -10] as Point,
    material: "glass" as const,
    amount: 6,
    element: "Flame",
    ability: "Thaw",
    description:
      "Warm fallen frostglass gently; living crystals stay untouched.",
  },
  {
    id: "reed",
    name: "Moonreed shore",
    point: [-24, 25] as Point,
    material: "reed" as const,
    amount: 3,
    element: "Grove",
    ability: "Weave",
    description: "Gather loose moonreed fibers for three slow-burning wicks.",
  },
  {
    id: "ember",
    name: "Warmstone spring",
    point: [28, 4] as Point,
    material: "ember" as const,
    amount: 3,
    element: "Tide",
    ability: "Cool",
    description:
      "Cool three warmstones from the spring without dimming their light.",
  },
];
export const HOLLOW_LANTERNS = [
  {
    id: "shore",
    name: "Lakeside lantern",
    point: [-35, 8] as Point,
    description: "A warm guide for Snowmew families along the water.",
  },
  {
    id: "summit",
    name: "Observatory lantern",
    point: [0, -27] as Point,
    description: "Light the approach to the old mountain observatory.",
  },
  {
    id: "refuge",
    name: "Refuge lantern",
    point: [29, 23] as Point,
    description: "Help wandering Wildbound find the eastern shelter.",
  },
];
export const HOLLOW_NOTES = [
  {
    id: "owl",
    name: "Feathers in the frost",
    point: [-16, -23] as Point,
    species: "rimeowl",
    description:
      "Rimeowl's soft feather edges quiet its flight. The birds carry loose moonreed to line warm nests beneath the observatory.",
  },
  {
    id: "fox",
    name: "Tracks under starlight",
    point: [25, -18] as Point,
    species: "frostwhisk",
    description:
      "Frostwhisk steps into the tracks of its family to conserve warmth. A single trail in the snow may belong to many companions.",
  },
];
export const HOLLOW_STOPS = [
  {
    id: "hol-workshop",
    name: "Mira's lantern workshop",
    point: HOLLOW_WORKSHOP,
    description:
      "Help Mira craft three lanterns and reopen the snowy migration road.",
  },
  ...HOLLOW_GATHER.map((n) => ({ ...n, id: `hol-${n.id}` })),
  ...HOLLOW_LANTERNS.map((n) => ({ ...n, id: `hol-${n.id}` })),
  ...HOLLOW_NOTES.map((n) => ({ ...n, id: `hol-${n.id}` })),
];
export const hollowPropPoint = (n: { point: Point }): Point => [
  n.point[0] + 2.4,
  n.point[1] + 1.8,
];
export const hollowPebbles = PEBBLES.filter(
  (p) => hollowPathDistance(p.x, p.z) > 1.5,
);
function openGround(x: number, z: number) {
  return (
    Math.hypot(x, z) < hollowEdge(Math.atan2(z, x)) - 1.5 &&
    Math.hypot(
      (x - HOLLOW_LAKE.x) / (HOLLOW_LAKE.rx + 0.5),
      (z - HOLLOW_LAKE.z) / (HOLLOW_LAKE.rz + 0.5),
    ) >= 1 &&
    !HOLLOW_BUILDINGS.some(
      (b) =>
        Math.abs(x - b.x) < b.width / 2 + 0.3 &&
        Math.abs(z - b.z) < b.depth / 2 + 0.3,
    ) &&
    !HOLLOW_MOUNTAINS.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + 0.4) &&
    ![...HOLLOW_GATHER, ...HOLLOW_LANTERNS, ...HOLLOW_NOTES].some(
      (n) =>
        Math.hypot(x - hollowPropPoint(n)[0], z - hollowPropPoint(n)[1]) < 0.7,
    )
  );
}
export const HOLLOW_FIRS = Array.from({ length: 85 }, (_, i) => {
  const a = i * 2.39996,
    r = 19 + (i % 21);
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    scale: 0.65 + (i % 4) * 0.15,
  };
}).filter(
  (p) =>
    openGround(p.x, p.z) &&
    hollowPathDistance(p.x, p.z) > 3.5 &&
    HOLLOW_STOPS.every(
      (s) =>
        Math.hypot(p.x - s.point[0], p.z - s.point[1]) >
        (s.id === "hol-workshop" ? 8 : 5),
    ),
);
export function hollowWalkable(x: number, z: number) {
  return (
    openGround(x, z) &&
    !HOLLOW_FIRS.some((p) => Math.hypot(x - p.x, z - p.z) < 0.55) &&
    !Array.from({ length: 9 }, (_, i) => [-11 + i * 2.4, -11]).some(
      ([a, b]) => Math.hypot(x - a, z - b) < 0.8,
    ) &&
    !((x - 11) ** 2 + (z - 4.4) ** 2 < 1.4) &&
    !((x - 7) ** 2 + (z + 3) ** 2 < 3.2) &&
    !((x + 6) ** 2 + (z + 3) ** 2 < 1.1) &&
    !(
      Math.abs(x - 1) > 1.6 &&
      Math.abs(x - 1) < 2.4 &&
      Math.abs(z + 6) < 0.5
    ) &&
    !hollowPebbles.some(
      (p) => p.size > 0.2 && Math.hypot(x - p.x, z - p.z) < p.size + 0.12,
    )
  );
}

export const HOLLOW_MATERIALS = {
  glass: "Frostglass",
  reed: "Moonreed",
  ember: "Warmstone",
} as const;
export type HollowMaterial = keyof typeof HOLLOW_MATERIALS;
export const LANTERN_RECIPE: Record<HollowMaterial, number> = {
  glass: 2,
  reed: 1,
  ember: 1,
};
export type HollowJourney = {
  started: boolean;
  gathered: string[];
  materials: Record<HollowMaterial, number>;
  lanterns: number;
  installed: string[];
  finished: boolean;
  notes: string[];
};
export const emptyHollow = (): HollowJourney => ({
  started: false,
  gathered: [],
  materials: { glass: 0, reed: 0, ember: 0 },
  lanterns: 0,
  installed: [],
  finished: false,
  notes: [],
});
export const hollowOf = (p: Profile) => p.hollow || emptyHollow();
export const canCraftLantern = (h: HollowJourney) =>
  h.started &&
  h.lanterns + h.installed.length < 3 &&
  (Object.keys(LANTERN_RECIPE) as HollowMaterial[]).every(
    (k) => h.materials[k] >= LANTERN_RECIPE[k],
  );
export function hollowObjective(p: Profile) {
  const h = hollowOf(p);
  if (!h.started || h.finished) return HOLLOW_STOPS[0];
  if (h.lanterns > 0) {
    const n = HOLLOW_LANTERNS.find((n) => !h.installed.includes(n.id));
    if (n) return HOLLOW_STOPS.find((s) => s.id === `hol-${n.id}`)!;
  }
  const n = HOLLOW_GATHER.find((n) => !h.gathered.includes(n.id));
  return n
    ? HOLLOW_STOPS.find((s) => s.id === `hol-${n.id}`)!
    : HOLLOW_STOPS[0];
}
export const HOLLOW_WILDLIFE: {
  species: string;
  point: Point;
  radius: number;
}[] = [
  { species: "snowmew", point: [-32, 19], radius: 0.6 },
  { species: "snowmew", point: [-26, 23], radius: 0.5 },
  { species: "frostwhisk", point: [24, -16], radius: 0.7 },
  { species: "rimeowl", point: [-12, -24], radius: 0.6 },
  { species: "auroroc", point: [6, -29], radius: 0.6 },
  { species: "glimlet", point: [22, 10], radius: 0.6 },
  { species: "shadecko", point: [29, 19], radius: 0.6 },
  { species: "rimeowl", point: [-33, 5], radius: 0.6 },
];

import type { Profile } from "./types";
import { PEBBLES, type Point } from "./haven";

export const MEADOW_EXTENT = 46;
export const MEADOW_POND = { x: -23, z: 8, rx: 6, rz: 5 };
export const MEADOW_LODGE: Point = [19, 12];
export const MEADOW_PATHS: Point[][] = [
  [
    [0, 5],
    [0, 12],
    [19, 12],
    [27, 20],
    [30, 0],
    [24, -18],
    [0, -27],
    [-20, -20],
    [-32, -4],
    [-32, 16],
    [-20, 24],
    [0, 12],
  ],
  [
    [0, -9],
    [-14, -8],
    [-20, -20],
  ],
];
export const MEADOW_BUILDINGS = [
  { x: 19, z: 18, width: 4.6, depth: 4, roof: "#6e9275" },
  { x: 28, z: -27, width: 3.6, depth: 3, roof: "#b59879" },
];
export const MEADOW_SHRINES = [
  {
    id: "brook",
    name: "Brook choir",
    point: [-32, 16] as Point,
    description: "Read the water's verse at the pond-side chimes.",
  },
  {
    id: "canopy",
    name: "Canopy choir",
    point: [24, -18] as Point,
    description: "Answer the birds from the high woodland clearing.",
  },
  {
    id: "root",
    name: "Heartroot choir",
    point: [0, -27] as Point,
    description: "Wake the old tree with the last woodland verse.",
  },
];
export const MEADOW_NOTES = [
  {
    id: "seed",
    name: "The seed couriers",
    point: [27, 20] as Point,
    species: "fernibble",
    description:
      "Fernibble hides seeds beneath fallen leaves. Forgotten stores become tomorrow's woodland.",
  },
  {
    id: "moth",
    name: "Wings in the dusk",
    point: [-20, -20] as Point,
    species: "glimlet",
    description:
      "Glimlet follows clearings between the trees. Its gentle light draws wandering companions toward shelter.",
  },
];
export const MEADOW_STOPS = [
  {
    id: "mea-lodge",
    name: "Rowan's woodland lodge",
    point: MEADOW_LODGE,
    description: "Help Rowan restore the three choirs of the living forest.",
  },
  ...MEADOW_SHRINES.map((s) => ({ ...s, id: `mea-${s.id}` })),
  ...MEADOW_NOTES.map((s) => ({ ...s, id: `mea-${s.id}` })),
];
export const meadowEdge = (a: number) =>
  39 + Math.sin(a * 3) * 2 + Math.cos(a * 5);
const smooth = (n: number) => {
  n = Math.max(0, Math.min(1, n));
  return n * n * (3 - 2 * n);
};
export function meadowHeight(x: number, z: number) {
  if (
    Math.hypot(
      (x - MEADOW_POND.x) / MEADOW_POND.rx,
      (z - MEADOW_POND.z) / MEADOW_POND.rz,
    ) < 1
  )
    return -0.7;
  return 3 * smooth((-z - 12) / 12);
}
export function meadowPathDistance(x: number, z: number) {
  let d = Infinity;
  for (const p of MEADOW_PATHS)
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1],
        [bx, bz] = p[i],
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
export const meadowPropPoint = (s: { point: Point }): Point => [
  s.point[0] + 2.4,
  s.point[1] - 1.8,
];
export const MEADOW_HEART: Point = [0, -33];
const meadowOpen = (x: number, z: number) =>
  Math.hypot(x, z) < meadowEdge(Math.atan2(z, x)) - 1 &&
  Math.hypot(
    (x - MEADOW_POND.x) / (MEADOW_POND.rx + 0.5),
    (z - MEADOW_POND.z) / (MEADOW_POND.rz + 0.5),
  ) >= 1 &&
  Math.hypot(x - MEADOW_HEART[0], z - MEADOW_HEART[1]) > 2 &&
  !MEADOW_BUILDINGS.some(
    (b) =>
      Math.abs(x - b.x) < b.width / 2 + 0.3 &&
      Math.abs(z - b.z) < b.depth / 2 + 0.3,
  ) &&
  ![...MEADOW_SHRINES, ...MEADOW_NOTES].some(
    (s) =>
      Math.hypot(x - meadowPropPoint(s)[0], z - meadowPropPoint(s)[1]) < 0.7,
  );
export const MEADOW_TREES = Array.from({ length: 100 }, (_, i) => {
  const a = i * 2.39996,
    r = 18 + (i % 18);
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    scale: 0.7 + (i % 4) * 0.15,
  };
}).filter(
  (p) =>
    meadowOpen(p.x, p.z) &&
    meadowPathDistance(p.x, p.z) > 3.5 &&
    MEADOW_STOPS.every(
      (s) => Math.hypot(p.x - s.point[0], p.z - s.point[1]) > 7,
    ),
);
export const meadowPebbles = PEBBLES.filter(
  (p) => meadowPathDistance(p.x, p.z) > 1.5,
);
export function meadowWalkable(x: number, z: number) {
  return (
    meadowOpen(x, z) &&
    !MEADOW_TREES.some((p) => Math.hypot(x - p.x, z - p.z) < 0.55) &&
    !((x - 11) ** 2 + (z - 4.4) ** 2 < 1.4) &&
    !((x - 7) ** 2 + (z + 3) ** 2 < 3.2) &&
    !((x + 6) ** 2 + (z + 3) ** 2 < 1.1) &&
    !(
      Math.abs(x - 1) > 1.6 &&
      Math.abs(x - 1) < 2.4 &&
      Math.abs(z + 6) < 0.5
    ) &&
    !meadowPebbles.some(
      (p) => p.size > 0.2 && Math.hypot(x - p.x, z - p.z) < p.size + 0.12,
    )
  );
}
export const MEADOW_WILDLIFE: {
  species: string;
  point: Point;
  radius: number;
}[] = [
  { species: "fernibble", point: [25, 18], radius: 0.5 },
  { species: "mossprig", point: [-30, 19], radius: 0.5 },
  { species: "bubbloom", point: [-30, 5], radius: 0.5 },
  { species: "glimlet", point: [-22, -18], radius: 0.5 },
  { species: "fernibble", point: [21, 11], radius: 0.5 },
  { species: "sylvarion", point: [-5, -27], radius: 0.5 },
];

export const MEADOW_TONES = [
  { id: 0, name: "Root", symbol: "?", color: "#87b87b", hz: 261.63 },
  { id: 1, name: "Rain", symbol: "?", color: "#83bdcf", hz: 329.63 },
  { id: 2, name: "Wing", symbol: "?", color: "#d6acdc", hz: 392 },
] as const;
export const MEADOW_VERSES: Record<string, { clue: string; answer: number[] }> =
  {
    brook: {
      clue: "Rain wakes the Root; the Wing carries its song.",
      answer: [1, 0, 2],
    },
    canopy: {
      clue: "Wing meets Wing; Rain returns to Root.",
      answer: [2, 2, 1, 0],
    },
    root: {
      clue: "Root drinks Rain; Wing returns to Root.",
      answer: [0, 1, 2, 0],
    },
  };
export type MeadowJourney = {
  started: boolean;
  choirs: string[];
  notes: string[];
  finished: boolean;
};
export const emptyMeadow = (): MeadowJourney => ({
  started: false,
  choirs: [],
  notes: [],
  finished: false,
});
export const meadowOf = (p: Profile) => p.meadow || emptyMeadow();
export function meadowObjective(p: Profile) {
  const m = meadowOf(p);
  if (!m.started || m.finished) return MEADOW_STOPS[0];
  const s = MEADOW_SHRINES.find((s) => !m.choirs.includes(s.id));
  return s
    ? MEADOW_STOPS.find((n) => n.id === `mea-${s.id}`)!
    : MEADOW_STOPS[0];
}

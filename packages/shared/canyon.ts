import type { Point } from "./haven";
import { PEBBLES } from "./haven";
import type { Profile } from "./types";

export const CANYON_EXTENT = 52;
export const CANYON_SPRINGS = [
  { x: 26, z: 18, rx: 6, rz: 4 },
  { x: 33, z: 8, rx: 3.5, rz: 2.5 },
];
export const CANYON_PATHS: Point[][] = [
  [
    [0, 5],
    [0, 12],
    [12, 18],
    [18, 26],
    [29, 26],
    [37, 18],
    [39, 3],
    [29, -10],
    [20, -18],
    [4, -19],
    [0, -15],
    [0, -9],
  ],
  [
    [0, 12],
    [-12, 18],
    [-23, 15],
    [-32, 7],
    [-32, -8],
    [-23, -18],
    [4, -19],
  ],
  [
    [-23, 15],
    [-24, 25],
  ],
];
export const CANYON_CAMP: Point = [-24, 25];
export const CANYON_BEACONS = [
  {
    id: "kiln",
    name: "Kilnheart beacon",
    point: [18, 26] as Point,
    element: "Flame",
    ability: "Kindle",
    clue: "Sunrise, dusk, spring: amber, violet, teal.",
    code: [0, 1, 2],
    text: "Warm the cold lens, then align its three colored shutters.",
  },
  {
    id: "spire",
    name: "Basalt Crown beacon",
    point: [-32, -8] as Point,
    element: "Stone",
    ability: "Brace",
    clue: "The violet crown rises above two amber foothills: violet, amber, amber.",
    code: [1, 0, 0],
    text: "Steady the leaning tower before tuning its signal.",
  },
  {
    id: "echo",
    name: "Echo Arch beacon",
    point: [20, -18] as Point,
    element: "Storm",
    ability: "Resonate",
    clue: "A spring on either side of dusk: teal, violet, teal.",
    code: [2, 1, 2],
    text: "Send a gentle current through the silent resonator.",
  },
] as const;
export const CANYON_NOTES = [
  {
    id: "shell",
    name: "Shells above the clouds",
    point: [-23, 15] as Point,
    species: "coppershell",
    text: "Spiral shells lie inside these dry cliffs. Coppershell traces their ridges: this floating reach once rested under a warm sea.",
  },
  {
    id: "spring",
    name: "The living spring",
    point: [29, 26] as Point,
    species: "reedlet",
    text: "Tiny mineral gardens thrive where warm water meets cool air. Reedlet shelters its eggs beside the gentlest trickles.",
  },
  {
    id: "glass",
    name: "A song in the glass",
    point: [29, -10] as Point,
    species: "zippinch",
    text: "Hollow crystals ring when the canyon breeze passes through them. Zippinch answers in the same three-note rhythm.",
  },
];
export const CANYON_GUARDIAN: Point = [4, -19];
export const CANYON_STOPS = [
  {
    id: "can-camp",
    name: "Ashkeeper Camp",
    point: CANYON_CAMP,
    description:
      "Ranger Senna needs help restoring the canyon's warning beacons.",
  },
  ...CANYON_BEACONS.map((n) => ({
    id: `can-${n.id}`,
    name: n.name,
    point: [...n.point] as Point,
    description: n.text,
  })),
  {
    id: "can-guardian",
    name: "The Glass Sentinel",
    point: CANYON_GUARDIAN,
    description: "Calm the sentinel after all three beacons are tuned.",
  },
  ...CANYON_NOTES.map((n) => ({
    id: `can-${n.id}`,
    name: n.name,
    point: n.point,
    description: n.text,
  })),
];
export const CANYON_LANDMARKS = [
  [-13, -4, 2.6],
  [13, -4, 2.6],
  [-4, -11, 1.15],
  [2, -11, 1.15],
];
export const CANYON_COLUMNS = [
  [-40, -13, 2.1, 8],
  [-39, -5, 1.8, 10],
  [-40, 4, 2.4, 7],
  [-36, 17, 2, 6],
  [-20, -29, 2.8, 9],
  [-9, -30, 2.2, 7],
  [5, -30, 2.5, 10],
  [19, -29, 1.8, 8],
  [28, -22, 2, 7],
  [44, 0, 1.5, 6],
  [41, 26, 2, 8],
  [-30, 32, 2.2, 5],
];
const smooth = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export function canyonHeight(x: number, z: number) {
  if (
    CANYON_SPRINGS.some(
      (p) => Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz) < 1,
    )
  )
    return -0.6;
  return 5 * smooth((-x - 14) / 20);
}
export function canyonEdge(angle: number) {
  return 44 + Math.sin(angle * 3) * 2 + Math.cos(angle * 5) * 1.5;
}
export function canyonPathDistance(x: number, z: number) {
  let d = Infinity;
  for (const path of CANYON_PATHS)
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        dx = bx - ax,
        dz = bz - az;
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
      d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
    }
  return d;
}
const canyonPebbleSites = PEBBLES.filter(
  (p) => canyonPathDistance(p.x, p.z) > 1.5,
);
export const canyonPebbles = () => canyonPebbleSites;
export function canyonPropPoint(n: {
  id: string;
  point: readonly number[];
}): Point {
  const offsets: Record<string, Point> = {
    kiln: [0, 3],
    spire: [-3, 0],
    echo: [0, -3],
    shell: [2, -2],
    spring: [0, 3],
    glass: [2, -2],
  };
  const d = offsets[n.id] || [0, 0];
  return [n.point[0] + d[0], n.point[1] + d[1]];
}
export function canyonWalkable(x: number, z: number) {
  return (
    Math.hypot(x, z) < canyonEdge(Math.atan2(z, x)) - 1.4 &&
    !CANYON_BEACONS.some(
      (n) =>
        Math.hypot(x - canyonPropPoint(n)[0], z - canyonPropPoint(n)[1]) < 0.75,
    ) &&
    !CANYON_NOTES.some(
      (n) =>
        Math.hypot(x - canyonPropPoint(n)[0], z - canyonPropPoint(n)[1]) < 0.6,
    ) &&
    !(Math.abs(x + 27) < 0.85 && Math.abs(z - 27) < 0.5) &&
    !CANYON_SPRINGS.some(
      (p) => Math.hypot((x - p.x) / (p.rx + 0.4), (z - p.z) / (p.rz + 0.4)) < 1,
    ) &&
    !CANYON_COLUMNS.some(
      ([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + 0.35,
    ) &&
    !CANYON_LANDMARKS.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) &&
    !(Math.abs(x + 24) < 2.3 && Math.abs(z - 30) < 2) &&
    !((x - 11) ** 2 + (z - 4.4) ** 2 < 1.4) &&
    !((x - 7) ** 2 + (z + 3) ** 2 < 3.2) &&
    !((x + 6) ** 2 + (z + 3) ** 2 < 1.1) &&
    !(
      Math.abs(x - 1) > 1.6 &&
      Math.abs(x - 1) < 2.4 &&
      Math.abs(z + 6) < 0.5
    ) &&
    !canyonPebbles().some(
      (p) => p.size > 0.2 && Math.hypot(x - p.x, z - p.z) < p.size + 0.12,
    )
  );
}
export type CanyonJourney = {
  started: boolean;
  beacons: string[];
  guardian: boolean;
  restored: boolean;
  notes: string[];
  fieldReward: boolean;
};
export const emptyCanyon = (): CanyonJourney => ({
  started: false,
  beacons: [],
  guardian: false,
  restored: false,
  notes: [],
  fieldReward: false,
});
export const canyonOf = (p: Profile) => p.canyon || emptyCanyon();
export function canyonObjective(p: Profile) {
  const c = canyonOf(p);
  if (!c.started) return CANYON_STOPS[0];
  const next = CANYON_BEACONS.find((n) => !c.beacons.includes(n.id));
  if (next) return CANYON_STOPS.find((s) => s.id === `can-${next.id}`)!;
  if (!c.guardian) return CANYON_STOPS.find((s) => s.id === "can-guardian")!;
  return CANYON_STOPS[0];
}

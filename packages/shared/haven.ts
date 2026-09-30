// All starting-island routes, habitats, and navigation coordinates share this map.
export type Point = [number, number];
export const HAVEN = {
  extent: 50,
  spawn: [0, 5] as Point,
  walkSpeed: 4,
  sprintSpeed: 6.7,
};
export const HAVEN_PLACES = [
  {
    id: "village",
    name: "Havenreach Village",
    short: "Village",
    point: [0, 5] as Point,
    color: "#e6cf95",
    description: "Your first six, familiar faces, and a warm place to return.",
    species: ["emberfox", "mossprig"],
  },
  {
    id: "orchard",
    name: "Sunseed Orchard",
    short: "Orchard",
    point: [-22, 22] as Point,
    color: "#d2bd85",
    description:
      "Golden fruit, low stone walls, and companions resting in the shade.",
    species: ["thornhare", "pebblit"],
  },
  {
    id: "grove",
    name: "Oldleaf Grove",
    short: "Grove",
    point: [-29, -6] as Point,
    color: "#7da995",
    description: "A quiet woodland path beneath broad, sheltering canopies.",
    species: ["mossprig", "briarhart"],
  },
  {
    id: "ruins",
    name: "Waystone Ruins",
    short: "Ruins",
    point: [-15, -28] as Point,
    color: "#b2aed0",
    description:
      "An old circle of standing stones remembers the first keepers.",
    species: ["glimlet", "pebblit"],
  },
  {
    id: "lookout",
    name: "Cloudwatch Lookout",
    short: "Lookout",
    point: [19, -30] as Point,
    color: "#a8d4d2",
    description:
      "A sheltered overlook above drifting islands and the open sky.",
    species: ["zippinch", "voltwing"],
  },
  {
    id: "pond",
    name: "Willowmere Pond",
    short: "Pond",
    point: [30, -5] as Point,
    color: "#8abfc6",
    description:
      "Cross the wooden bridge and watch little Tide Wildbound along the water.",
    species: ["puddlepip", "ripplefin"],
  },
  {
    id: "meadow",
    name: "Sunpetal Clearing",
    short: "Clearing",
    point: [8, 26] as Point,
    color: "#d8beaa",
    description:
      "A bright picnic clearing, flowers, and butterflies near the village trail.",
    species: ["thornhare", "cindermite"],
  },
] as const;
export const HAVEN_PATHS: Point[][] = [
  [
    [0, 5],
    [0, 11],
    [-12, 15],
    [-22, 22],
    [-31, 12],
    [-29, -6],
    [-23, -19],
    [-15, -28],
    [2, -33],
    [19, -30],
    [29, -17],
    [30, -5],
    [29, 4],
    [22, 17],
    [8, 26],
    [0, 11],
  ],
  [
    [0, 5],
    [5, 10],
    [14, 11],
    [22, 17],
  ],
  [
    [0, 0],
    [0, -10],
    [-5, -18],
    [-15, -28],
  ],
  [
    [0, -10],
    [8, -9],
    [12, -5],
    [30, -5],
  ],
  [
    [-12, 15],
    [-18, 2],
    [-29, -6],
  ],
];
export const HAVEN_POND = { x: 21, z: -5, rx: 8, rz: 6, bridgeHalfWidth: 1.25 };
export function edgeRadius(angle: number) {
  return 44 + Math.sin(angle * 3) * 2 + Math.cos(angle * 5) * 1.5;
}
export function onIsland(x: number, z: number, margin = 1.4) {
  return Math.hypot(x, z) < edgeRadius(Math.atan2(z, x)) - margin;
}
export function inPond(x: number, z: number, margin = 0) {
  const p = HAVEN_POND;
  return (
    ((x - p.x) / (p.rx + margin)) ** 2 + ((z - p.z) / (p.rz + margin)) ** 2 < 1
  );
}
export function onBridge(x: number, z: number) {
  return (
    x >= 12 &&
    x <= 30 &&
    Math.abs(z - HAVEN_POND.z) < HAVEN_POND.bridgeHalfWidth
  );
}
export function havenWalkable(x: number, z: number) {
  return onIsland(x, z) && (!inPond(x, z, 0.35) || onBridge(x, z));
}
export function segmentDistance(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = dx * dx + dz * dz;
  const t = length
    ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length))
    : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
export function pathDistance(x: number, z: number) {
  return Math.min(
    ...HAVEN_PATHS.flatMap((path) =>
      path.slice(1).map((b, i) => segmentDistance(x, z, path[i], b)),
    ),
  );
}
export function placeAt(x: number, z: number) {
  return HAVEN_PLACES.reduce(
    (best, p) =>
      Math.hypot(x - p.point[0], z - p.point[1]) <
      Math.hypot(x - best.point[0], z - best.point[1])
        ? p
        : best,
    HAVEN_PLACES[0],
  );
}
export function mapPercent(value: number, region: string) {
  return 50 + (value / (region === "haven" ? HAVEN.extent : 20)) * 50;
}
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// All starting-island routes, habitats, and navigation coordinates share this map.
export type Point = [number, number];
export const HAVEN_HOUSES = [
  {
    id: "bakery",
    name: "Hearthcrumb Bakery",
    point: [-10, -11] as Point,
    roof: "#bc7e63",
    wall: "#e4ccb0",
    description:
      "A warm oven, a flour-dusted doorstep, and a basket left for travelers. The baker presses a little wheat stamp into your visitor book.",
  },
  {
    id: "workshop",
    name: "Maplewick Workshop",
    point: [-14, 5] as Point,
    roof: "#688d8a",
    wall: "#cfc6a5",
    description:
      "Wooden toys and repaired trail lanterns line the porch. A carved leaf marks the workshop's page in your book.",
  },
  {
    id: "glasshouse",
    name: "Sunpetal Glasshouse",
    point: [13, 15] as Point,
    roof: "#91bec0",
    wall: "#d7d3ad",
    description:
      "Young plants shelter behind sea-green glass. Wren leaves growing notes here, beside a stamp shaped like a tiny seedling.",
  },
  {
    id: "orchard-home",
    name: "Applebright Cottage",
    point: [-28, 27] as Point,
    roof: "#a97569",
    wall: "#e7d0ae",
    description:
      "Ribbons flutter beside jars of orchard preserves. A small apple stamp remembers your walk through the golden fruit trees.",
  },
  {
    id: "ranger-lodge",
    name: "Cloudwatch Lodge",
    point: [29, -23] as Point,
    roof: "#627f86",
    wall: "#bea782",
    description:
      "The rangers keep spare blankets and weather journals on this sheltered porch. Their feather stamp belongs to anyone who takes the long path.",
  },
  {
    id: "grove-refuge",
    name: "Oldleaf Refuge",
    point: [-34, -14] as Point,
    roof: "#789076",
    wall: "#c9ba98",
    description:
      "A quiet woodland shelter with mossy pots and a kettle by the door. Its acorn stamp celebrates the patient explorer.",
  },
] as const;
export const houseDoor = (h: (typeof HAVEN_HOUSES)[number]): Point => [
  h.point[0],
  h.point[1] + 2.5,
];
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
  [
    [0, -10],
    [-5, -7],
    [-10, -8.5],
  ],
  [
    [-18, 2],
    [-18, 8],
    [-14, 7.5],
  ],
  [
    [14, 11],
    [17, 13],
    [17, 18],
    [13, 17.5],
  ],
  [
    [-22, 22],
    [-22, 30],
    [-28, 29.5],
  ],
  [
    [29, -17],
    [29, -20.5],
  ],
  [
    [-29, -6],
    [-34, -11.5],
  ],
  [
    [29, 4],
    [25, 2.6],
  ],
];
export const HAVEN_POND = { x: 21, z: -5, rx: 8, rz: 6, bridgeHalfWidth: 1.25 };
// The fishing dock reaches from the south shore into Willowmere.
export const HAVEN_DOCK = { x: 25, z0: -1.9, z1: 2.4, halfWidth: 0.85 };
export const FISHING_SPOT: Point = [25, -1.2];
export function onDock(x: number, z: number) {
  const d = HAVEN_DOCK;
  return Math.abs(x - d.x) < d.halfWidth && z > d.z0 && z < d.z1;
}
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
  return (
    onIsland(x, z) &&
    (!inPond(x, z, 0.35) || onBridge(x, z) || onDock(x, z)) &&
    !HAVEN_HOUSES.some(
      (h) => Math.abs(x - h.point[0]) < 1.9 && Math.abs(z - h.point[1]) < 1.8,
    ) &&
    !blockedByStructure(x, z) &&
    !HAVEN_LANDMARK_OBSTACLES.some(
      (o) => Math.hypot(x - o.x, z - o.z) < o.radius,
    ) &&
    !HAVEN_TREES.some(
      (t) => Math.hypot(x - t.x, z - t.z) < 0.3 * t.scale + 0.24,
    )
  );
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

export const HAVEN_WILDLIFE = [
  { species: "thornhare", point: [-24, 20] as Point, radius: 1.2 },
  { species: "pebblit", point: [-20, 24] as Point, radius: 1 },
  { species: "mossprig", point: [-27, -4] as Point, radius: 1.3 },
  { species: "mossprig", point: [-31, -9] as Point, radius: 1 },
  { species: "briarhart", point: [-26, -12] as Point, radius: 1.4 },
  { species: "glimlet", point: [-16, -25] as Point, radius: 1.1 },
  { species: "pebblit", point: [-12, -26] as Point, radius: 0.8 },
  { species: "zippinch", point: [22, -28] as Point, radius: 1.1 },
  { species: "voltwing", point: [16, -32] as Point, radius: 1 },
  { species: "ripplefin", point: [21, -8] as Point, radius: 1.2, water: true },
  { species: "bubbloom", point: [22, -1] as Point, radius: 0.8, water: true },
  { species: "puddlepip", point: [29, 1] as Point, radius: 0.7 },
  { species: "thornhare", point: [5, 25] as Point, radius: 1.1 },
  { species: "cindermite", point: [11, 28] as Point, radius: 1.3 },
  { species: "pebblit", point: [3, 22] as Point, radius: 1.1 },
  { species: "zippinch", point: [3, 13] as Point, radius: 0.8 },
  { species: "mossprig", point: [-13, 12] as Point, radius: 0.9 },
  // Evolved forms and rarer residents hint at what companions can become.
  { species: "thornstag", point: [-33, -2] as Point, radius: 0.9 },
  { species: "luminmoth", point: [-12, -31] as Point, radius: 0.8 },
  { species: "tidecrest", point: [17.5, -3] as Point, radius: 0.9, water: true },
  { species: "thunderkite", point: [24, -31] as Point, radius: 1.2 },
  { species: "bramblehop", point: [14, 23] as Point, radius: 1 },
  { species: "hearthwaddle", point: [1, 27] as Point, radius: 0.8 },
  { species: "pearlbloom", point: [24.5, -8.5] as Point, radius: 0.9, water: true },
  { species: "cragmaw", point: [22, 10] as Point, radius: 1 },
  { species: "fernibble", point: [-25, 17] as Point, radius: 1 },
  { species: "dawnfawn", point: [6, 32] as Point, radius: 1.1 },
];
export const RESOURCE_NODES = [
  { id: "resource-0", point: [-6, 8] as Point },
  { id: "resource-1", point: [0, 6] as Point },
  { id: "resource-2", point: [7, 7] as Point },
  { id: "resource-3", point: [-21, 20] as Point, haven: true },
  { id: "resource-4", point: [-28, -4] as Point, haven: true },
  { id: "resource-5", point: [-13, -26] as Point, haven: true },
  { id: "resource-6", point: [21, -28] as Point, haven: true },
  { id: "resource-7", point: [31, -3] as Point, haven: true },
  { id: "resource-8", point: [10, 24] as Point, haven: true },
];
export function nearestPathPoint(x: number, z: number): Point {
  let best: Point = [x, z],
    distance = Infinity;
  for (const path of HAVEN_PATHS)
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        dx = bx - ax,
        dz = bz - az,
        length = dx * dx + dz * dz,
        t = length
          ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / length))
          : 0,
        px = ax + t * dx,
        pz = az + t * dz,
        d = Math.hypot(x - px, z - pz);
      if (d < distance) {
        distance = d;
        best = [px, pz];
      }
    }
  return best;
}
// Rotation that turns a structure's local +Z (its front door) toward the nearest trail.
export function facePath(x: number, z: number) {
  const [px, pz] = nearestPathPoint(x, z);
  return Math.atan2(px - x, pz - z);
}

// Decorative village homes. Visitor-book houses stay in HAVEN_HOUSES.
export type CottageStyle = "cottage" | "tall" | "long";
export const COTTAGE_SIZE: Record<CottageStyle, { w: number; d: number }> = {
  cottage: { w: 3, d: 2.6 },
  tall: { w: 2.8, d: 2.6 },
  long: { w: 4.2, d: 2.6 },
};
export const HAVEN_COTTAGES = (
  [
    ["thistle", [17.5, 8.5], "cottage", "#6f8f8c", "#dccdac", "#9a6b55"],
    ["lark", [-1.5, -20], "long", "#8e6f87", "#e3d6bc", "#5e7488"],
    ["fern", [-20.5, -4.5], "cottage", "#7d8f62", "#d2c3a0", "#8c5f50"],
    ["hearth", [-17.5, 12], "tall", "#b98a6a", "#e8d9bd", "#4f6f6c"],
    ["clover", [-8.5, 19.5], "long", "#a65f55", "#ead8b6", "#5b7a63"],
    ["moss", [-11, -18.5], "cottage", "#5f7a90", "#d6c8a8", "#a0704f"],
    ["amber", [-22, 4], "cottage", "#c08b5c", "#e2d2b4", "#62806f"],
    ["heron", [-19, -12.5], "tall", "#6a7f8a", "#d9cbad", "#9b5d52"],
  ] as const
).map(([id, point, style, roof, wall, shutter]) => ({
  id,
  point: point as unknown as Point,
  style: style as CottageStyle,
  roof,
  wall,
  shutter,
  rotation: facePath(point[0], point[1]),
}));
export const HAVEN_WINDMILL = { point: [-0.5, 23] as Point };
// The Riftgate opens story chapters and daily dungeons.
export const HAVEN_RIFTGATE = {
  point: [2.5, -13.5] as Point,
  rotation: facePath(2.5, -13.5),
};
export const HAVEN_WELL = { point: [-2, 15.5] as Point };
export const HAVEN_CAMPFIRE = { point: [3.5, 29.5] as Point };

// Every solid village prop is an oriented rectangle in local space.
export type Structure = {
  kind: string;
  x: number;
  z: number;
  rotation: number;
  hw: number;
  hd: number;
};
function lampSites(): Point[] {
  const sites: Point[] = [
    [3, 8.6],
    [-3, 8.9],
  ];
  let side = 1;
  for (const path of HAVEN_PATHS)
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        length = Math.hypot(bx - ax, bz - az);
      for (let s = 4; s < length - 2; s += 11) {
        const t = s / length,
          x = ax + (bx - ax) * t + (-(bz - az) / length) * 2 * side,
          z = az + (bz - az) * t + ((bx - ax) / length) * 2 * side;
        side = -side;
        if (
          Math.hypot(x, z - 1) < 9.5 ||
          !onIsland(x, z, 3) ||
          inPond(x, z, 1.4) ||
          pathDistance(x, z) < 1.8 ||
          HAVEN_HOUSES.some(
            (h) => Math.hypot(x - h.point[0], z - h.point[1]) < 4,
          ) ||
          HAVEN_COTTAGES.some(
            (h) => Math.hypot(x - h.point[0], z - h.point[1]) < 4,
          ) ||
          [HAVEN_WINDMILL, HAVEN_WELL, HAVEN_CAMPFIRE, HAVEN_RIFTGATE].some(
            (p) => Math.hypot(x - p.point[0], z - p.point[1]) < 3.5,
          ) ||
          HAVEN_PLACES.some(
            (p) => Math.hypot(x - p.point[0], z - p.point[1]) < 3.6,
          ) ||
          RESOURCE_NODES.some(
            (p) => Math.hypot(x - p.point[0], z - p.point[1]) < 2.5,
          ) ||
          HAVEN_WILDLIFE.some(
            (p) =>
              Math.hypot(x - p.point[0], z - p.point[1]) < p.radius + 1.6,
          ) ||
          sites.some((p) => Math.hypot(x - p[0], z - p[1]) < 6)
        )
          continue;
        sites.push([x, z]);
      }
    }
  return sites;
}
export const HAVEN_LAMPS = lampSites();
export const HAVEN_STRUCTURES: Structure[] = [
  ...HAVEN_COTTAGES.map((c) => ({
    kind: `cottage-${c.id}`,
    x: c.point[0],
    z: c.point[1],
    rotation: c.rotation,
    hw: COTTAGE_SIZE[c.style].w / 2 + 0.6,
    hd: COTTAGE_SIZE[c.style].d / 2 + 0.75,
  })),
  {
    kind: "riftgate",
    x: HAVEN_RIFTGATE.point[0],
    z: HAVEN_RIFTGATE.point[1],
    rotation: HAVEN_RIFTGATE.rotation,
    hw: 2.3,
    hd: 0.9,
  },
  {
    kind: "windmill",
    x: HAVEN_WINDMILL.point[0],
    z: HAVEN_WINDMILL.point[1],
    rotation: 0,
    hw: 1.6,
    hd: 1.6,
  },
  {
    kind: "well",
    x: HAVEN_WELL.point[0],
    z: HAVEN_WELL.point[1],
    rotation: 0,
    hw: 1.05,
    hd: 1.05,
  },
  {
    kind: "campfire",
    x: HAVEN_CAMPFIRE.point[0],
    z: HAVEN_CAMPFIRE.point[1],
    rotation: 0,
    hw: 1.55,
    hd: 1.55,
  },
  ...HAVEN_LAMPS.map(([x, z]) => ({
    kind: "lamp",
    x,
    z,
    rotation: 0,
    hw: 0.2,
    hd: 0.2,
  })),
];
export function blockedByStructure(x: number, z: number, pad = 0) {
  return HAVEN_STRUCTURES.some((s) => {
    const dx = x - s.x,
      dz = z - s.z;
    if (Math.abs(dx) > 5 + pad || Math.abs(dz) > 5 + pad) return false;
    const c = Math.cos(s.rotation),
      n = Math.sin(s.rotation);
    return (
      Math.abs(dx * c - dz * n) < s.hw + pad &&
      Math.abs(dx * n + dz * c) < s.hd + pad
    );
  });
}

// Hidden Skyglass caches reward exploring away from the trails.
export type CacheReward = {
  gold?: number;
  diamonds?: number;
  xp?: number;
  tokens?: number;
  sunseed?: number;
  treat?: number;
};
export const HAVEN_CACHES: {
  id: string;
  name: string;
  point: Point;
  clue: string;
  reward: CacheReward;
}[] = [
  {
    id: "orchard-wall",
    name: "Orchard hollow cache",
    point: [-11, 28],
    clue: "Between the apple cottage and the picnic meadow, where no trail bothers to go.",
    reward: { sunseed: 3, gold: 30 },
  },
  {
    id: "south-bluff",
    name: "Southern bluff cache",
    point: [8, 37],
    clue: "Walk past the Sunpetal picnic until the island runs out of ground.",
    reward: { diamonds: 30 },
  },
  {
    id: "glass-meadow",
    name: "Glasshouse meadow cache",
    point: [26, 27.5],
    clue: "Behind the sea-green glasshouse, deep in the southeastern grass.",
    reward: { treat: 2, gold: 20 },
  },
  {
    id: "cloudfall",
    name: "Cloudfall cache",
    point: [40, 4.5],
    clue: "Listen for water falling off the eastern edge of the world.",
    reward: { diamonds: 40 },
  },
  {
    id: "hidden-woods",
    name: "Quiet woods cache",
    point: [12.5, -20],
    clue: "In the woods between the pond and the lookout, far from every path.",
    reward: { gold: 60 },
  },
  {
    id: "west-bluff",
    name: "Western bluff cache",
    point: [-38.5, 20],
    clue: "West of the orchard, where the cliff looks toward the setting sun.",
    reward: { tokens: 1, gold: 20 },
  },
  {
    id: "deep-grove",
    name: "Deep grove cache",
    point: [-33, -22.5],
    clue: "Beyond Oldleaf's pines, where the ruins trail bends away north.",
    reward: { gold: 40, xp: 30 },
  },
  {
    id: "north-edge",
    name: "Northern edge cache",
    point: [-5.5, -41],
    clue: "Past the standing stones, at the very top of the map.",
    reward: { diamonds: 30, sunseed: 2 },
  },
];
export const CACHE_COMPLETION_DIAMONDS = 100;

export type TreeSite = { x: number; z: number; scale: number; pine: boolean };
export function forestSites(): TreeSite[] {
  const random = seeded(8315),
    sites: TreeSite[] = [];
  for (let i = 0; i < 900; i++) {
    const x = (random() - 0.5) * 90,
      z = (random() - 0.5) * 90;
    if (
      !onIsland(x, z, 3) ||
      Math.hypot(x, z) < 14 ||
      inPond(x, z, 2) ||
      (z < -28 && x > 10 && x < 29) ||
      HAVEN_HOUSES.some(
        (h) => Math.hypot(x - h.point[0], z - h.point[1]) < 5,
      ) ||
      pathDistance(x, z) < 2.7 ||
      HAVEN_PLACES.some(
        (p) => Math.hypot(x - p.point[0], z - p.point[1]) < 4.9,
      ) ||
      blockedByStructure(x, z, 1.7) ||
      HAVEN_CACHES.some((c) => Math.hypot(x - c.point[0], z - c.point[1]) < 2.6)
    )
      continue;
    if (sites.some((t) => Math.hypot(t.x - x, t.z - z) < 2.4)) continue;
    sites.push({
      x,
      z,
      scale: 0.85 + random() * 0.75,
      pine: x < -18 && z < 12,
    });
  }
  return sites;
}
export const HAVEN_TREES = forestSites();
export const HAVEN_LANDMARK_OBSTACLES = [
  ...[
    [-18.7, -28],
    [-11.3, -28],
    [-16.8, -31.5],
    [-13.2, -31.5],
  ].map(([x, z]) => ({ x, z, radius: 0.65, kind: "stone" })),
  ...[
    [-27, 24],
    [-25, 27],
    [-18, 27],
    [-17, 20],
  ].map(([x, z]) => ({ x, z, radius: 0.55, kind: "fruit" })),
  ...[
    [18, -27.4],
    [7, 29],
    [32, -1],
  ].map(([x, z]) => ({ x, z, radius: 0.75, kind: "bench" })),
];
export const resourcesForRegion = (region: string) =>
  RESOURCE_NODES.filter((n) => !n.haven || region === "haven");
export function slideStep(
  x: number,
  z: number,
  dx: number,
  dz: number,
  allowed: (x: number, z: number) => boolean,
): Point {
  if (allowed(x + dx, z + dz)) return [x + dx, z + dz];
  if (allowed(x + dx, z)) x += dx;
  if (allowed(x, z + dz)) z += dz;
  return [x, z];
}

import type { Profile } from "./types";
export type Material = "timber" | "fiber" | "crystal";
export type KitId = "shelter" | "planter" | "lantern";
export const MATERIALS: Record<Material, string> = {
  timber: "Fallen timber",
  fiber: "Meadow fiber",
  crystal: "Gleamstone",
};
export const RECIPES: {
  id: KitId;
  name: string;
  cost: Partial<Record<Material, number>>;
  description: string;
}[] = [
  {
    id: "shelter",
    name: "Shelter kit",
    cost: { timber: 2, fiber: 1 },
    description: "A dry nesting shelter woven from fallen branches.",
  },
  {
    id: "planter",
    name: "Planter kit",
    cost: { fiber: 2, crystal: 1 },
    description: "Soft bedding and a luminous seed garden.",
  },
  {
    id: "lantern",
    name: "Trail lantern",
    cost: { crystal: 2, timber: 1 },
    description: "A warm guide light for migrating companions.",
  },
];
export const OUTPOSTS = [
  {
    region: "haven",
    id: "cons-haven",
    name: "Juniper's orchard refuge",
    host: "Juniper",
    avatar: 4,
    point: [-15, 31] as [number, number],
    color: "#d2b776",
    species: "mossloom",
    story:
      "Fallen branches can become a roof. Leave the living trees standing and let their smallest neighbors do the gardening.",
    join: [-22, 30] as [number, number],
  },
  {
    region: "meadow",
    id: "cons-meadow",
    name: "Tamsin's silk garden",
    host: "Tamsin",
    avatar: 3,
    point: [-12, -26] as [number, number],
    color: "#bba0c8",
    species: "mossloom",
    story:
      "Mossloom weaves safe paths through the roots. Give it a quiet garden and it will stitch the forest back together.",
    join: [0, -27] as [number, number],
  },
  {
    region: "canyon",
    id: "cons-canyon",
    name: "Daro's cliff sanctuary",
    host: "Daro",
    avatar: 7,
    point: [-31, -19] as [number, number],
    color: "#d39d76",
    species: "astralynx",
    story:
      "The cliffs remember every storm. Our shelters should bend with the wind, and our lanterns should guide travelers around the steepest stone.",
    join: [-23, -18] as [number, number],
  },
  {
    region: "hollow",
    id: "cons-hollow",
    name: "Elowen's snow garden",
    host: "Elowen",
    avatar: 5,
    point: [19, -12] as [number, number],
    color: "#98bccf",
    species: "astralynx",
    story:
      "Astralynx follows the spaces between the stars. A little light on the ground tells it that a warm resting place is waiting.",
    join: [28, 4] as [number, number],
  },
];
export const SUPPLY_NODES = OUTPOSTS.flatMap((h) =>
  (["timber", "fiber", "crystal"] as Material[]).map((material, i) => ({
    id: `cons-${h.region}-${material}`,
    region: h.region,
    material,
    amount: 3,
    name: `${h.host}'s ${MATERIALS[material].toLowerCase()}`,
    point: [h.point[0] + [-5, -3, 4][i], h.point[1] + [0, 5, 5][i]] as [
      number,
      number,
    ],
    description: `Gather three ${MATERIALS[material].toLowerCase()}. This site replenishes at 00:00 UTC.`,
  })),
);
export const CONSERVANCY_STOPS = [
  ...OUTPOSTS.map((h) => ({
    ...h,
    description:
      "Gather supplies, craft three habitat kits and restore this outpost.",
  })),
  ...SUPPLY_NODES,
];
export const conservancyStops = (region: string) =>
  CONSERVANCY_STOPS.filter((s) => s.region === region);
export const CONSERVANCY_PATHS = Object.fromEntries(
  OUTPOSTS.map((h) => [
    h.region,
    [
      [h.join, h.point],
      ...[...SUPPLY_NODES.filter((n) => n.region === h.region)].map((n) => [
        h.point,
        n.point,
      ]),
    ],
  ]),
);
export const conservancyProp = (s: {
  point: [number, number];
}): [number, number] => [s.point[0] + 2.4, s.point[1] - 1.8];
export function conservancyBlocked(region: string, x: number, z: number) {
  const h = OUTPOSTS.find((h) => h.region === region);
  if (!h) return false;
  const [a, b] = conservancyProp(h);
  return Math.abs(x - a) < 1.2 && Math.abs(z - b) < 0.9;
}
export type ConservancyState = {
  day: string;
  gathered: string[];
  materials: Record<Material, number>;
  kits: Record<KitId, number>;
  installed: Record<string, KitId[]>;
  claims: string[];
  tended: string[];
};
export const conservancyDay = (now = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);
export function conservancyOf(p: Profile, now = Date.now()): ConservancyState {
  const day = conservancyDay(now),
    r = p.conservancy;
  return r
    ? {
        ...r,
        day,
        gathered: r.day === day ? r.gathered : [],
        tended: r.day === day ? r.tended : [],
      }
    : {
        day,
        gathered: [],
        tended: [],
        materials: { timber: 0, fiber: 0, crystal: 0 },
        kits: { shelter: 0, planter: 0, lantern: 0 },
        installed: {},
        claims: [],
      };
}
export const outpostComplete = (r: ConservancyState, region: string) =>
  RECIPES.every((k) => r.installed[region]?.includes(k.id));

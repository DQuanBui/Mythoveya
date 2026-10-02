// Islands reached by Skyferry, and the rules for building on the Home island.
import { byId, TIERS } from "./content";
import type { Owned, Profile } from "./types";
import { FESTIVAL_RADIUS } from "./festival";

export type IslandId = "home" | "festival";
export const ISLANDS: Record<
  IslandId,
  { name: string; subtitle: string; color: string; ground: string }
> = {
  home: {
    name: "Hearthfall Isle",
    subtitle: "Your own island to build and share with your companions",
    color: "#9cc1a4",
    ground: "#8fb487",
  },
  festival: {
    name: "Lanternfair Isle",
    subtitle: "Races, games and lanterns that never go out",
    color: "#d8b9c9",
    ground: "#b9c79b",
  },
};
/** Islands the Skyferry currently sails to. */
export const OPEN_ISLANDS: IslandId[] = ["home"];
export const isIsland = (region: string): region is IslandId =>
  region === "home" || region === "festival";
export const islandUnlocked = (p: Profile, id: IslandId) =>
  id === "home" ? p.owned.length > 0 : p.wins >= 1;
export const unlockHint = (id: IslandId) =>
  id === "home" ? "Choose your first companion." : "Win your first battle.";
/** Where you step off the Skyferry; each island's dock is on its west shore. */
export const islandArrival = (id: IslandId, radius: number): [number, number] =>
  id === "home" ? [-(radius - 3), 0] : [-(FESTIVAL_RADIUS - 3), 0];
/** The landward end of an island's Skyferry dock. */
export const islandDock = (radius: number): [number, number] => [-(radius - 1.5), 0];

export type HomeItem = { uid: string; kind: string; x: number; z: number; rot: number };
export type HomeState = {
  expansion: number;
  house: number;
  items: HomeItem[];
  /** Habitat uid → owned companion ids living there. */
  residents: Record<string, string[]>;
  /** Habitat uid → time its stored income was last emptied. */
  collected: Record<string, number>;
  seq: number;
  /** Festival decorations bought with tickets and not yet placed. */
  stash?: Record<string, number>;
  /** Companions greeted today; each greeting is a small friendship gain. */
  petted?: { day: string; ids: string[] };
};
export const HOME_EXPANSIONS = [
  { radius: 14, gold: 0, diamonds: 0, level: 1 },
  { radius: 18, gold: 600, diamonds: 0, level: 3 },
  { radius: 22, gold: 1500, diamonds: 0, level: 8 },
  { radius: 26, gold: 3500, diamonds: 100, level: 14 },
  { radius: 30, gold: 7000, diamonds: 250, level: 20 },
];
export const HOUSE_LEVELS = [
  { name: "Keeper's cottage", gold: 0, level: 1, habitats: 2, decor: 12 },
  { name: "Porch cottage", gold: 800, level: 4, habitats: 3, decor: 20 },
  { name: "Two-storey house", gold: 2000, level: 10, habitats: 4, decor: 30 },
  { name: "Tower house", gold: 4500, level: 16, habitats: 6, decor: 45 },
  { name: "Riftkeeper manor", gold: 9000, level: 24, habitats: 8, decor: 60 },
];
export type CatalogEntry = {
  kind: string;
  name: string;
  icon: string;
  type: "decor" | "habitat";
  w: number;
  d: number;
  gold: number;
  house: number;
  element?: string;
  /** Festival pieces are bought with festival tickets at Lanternfair. */
  tickets?: number;
};
const decor = (kind: string, name: string, icon: string, w: number, d: number, gold: number, house = 0): CatalogEntry => ({
  kind, name, icon, type: "decor", w, d, gold, house,
});
const habitat = (element: string, name: string, gold: number, house: number): CatalogEntry => ({
  kind: `habitat-${element.toLowerCase()}`,
  name,
  icon: "⌂",
  type: "habitat",
  w: 4,
  d: 4,
  gold,
  house,
  element,
});
export const CATALOG: CatalogEntry[] = [
  decor("oak", "Shade oak", "♣", 2, 2, 60),
  decor("pine", "Hill pine", "♠", 2, 2, 60),
  decor("flowers", "Flower bed", "✿", 2, 1, 40),
  decor("lantern", "Garden lantern", "✦", 1, 1, 50),
  decor("bench", "Wooden bench", "▭", 2, 1, 70),
  decor("fence", "Picket fence", "≡", 2, 1, 20),
  decor("rocks", "Rock garden", "◒", 2, 2, 80),
  decor("mushrooms", "Mushroom ring", "♧", 2, 2, 90),
  decor("bunting", "Festival bunting", "⋀", 3, 1, 120),
  decor("pond", "Lily pond", "≈", 4, 3, 300, 1),
  decor("arch", "Rose arch", "∩", 3, 1, 400, 1),
  decor("windchime", "Wind chime post", "♪", 1, 1, 150, 1),
  decor("fountain", "Stone fountain", "⛲", 3, 3, 600, 2),
  decor("statue", "Wildbound statue", "♜", 2, 2, 900, 3),
  { ...decor("lantern-arch", "Lantern arch", "∩", 3, 1, 0), tickets: 30 },
  { ...decor("balloon-cart", "Balloon cart", "◍", 2, 2, 0), tickets: 40 },
  { ...decor("festival-tent", "Striped tent", "⛺", 3, 3, 0), tickets: 55 },
  { ...decor("mini-carousel", "Little carousel", "✺", 3, 3, 0), tickets: 80 },
  habitat("Flame", "Ember hearth", 500, 0),
  habitat("Tide", "Tide pool", 500, 0),
  habitat("Grove", "Grove glade", 500, 0),
  habitat("Stone", "Stone den", 700, 1),
  habitat("Storm", "Storm perch", 700, 1),
  habitat("Frost", "Frost grotto", 900, 2),
  habitat("Light", "Sun shrine", 1200, 3),
  habitat("Shadow", "Moon hollow", 1200, 3),
];
export const catalogEntry = (kind: string) => CATALOG.find((c) => c.kind === kind);
export const HABITAT_CAPACITY = 3;
export const HABITAT_STORAGE_HOURS = 8;
/** Gold per hour a companion earns in a habitat; matching the element pays half again. */
export function residentRate(o: Owned, element?: string) {
  const s = byId[o.species];
  if (!s) return 0;
  const rank = TIERS.indexOf(s.tier as (typeof TIERS)[number]);
  return Math.round((5 + Math.max(0, rank) * 3) * (s.element === element ? 1.5 : 1));
}
export function habitatRate(p: Profile, home: HomeState, item: HomeItem) {
  const entry = catalogEntry(item.kind);
  return (home.residents[item.uid] || []).reduce((sum, id) => {
    const o = p.owned.find((x) => x.id === id);
    return sum + (o ? residentRate(o, entry?.element) : 0);
  }, 0);
}
export function habitatStored(p: Profile, home: HomeState, item: HomeItem, now = Date.now()) {
  const hours = Math.min(HABITAT_STORAGE_HOURS, Math.max(0, (now - (home.collected[item.uid] || now)) / 3600000));
  return Math.floor(habitatRate(p, home, item) * hours);
}
export const homeRadius = (home: HomeState) => HOME_EXPANSIONS[home.expansion].radius;
/** Half the width of the house yard, sized for the largest house so upgrades never collide. */
export const HOUSE_YARD = 4;
/** The cells an item covers; rotation swaps width and depth. */
export function footprint(entry: CatalogEntry, x: number, z: number, rot: number) {
  const w = rot % 2 ? entry.d : entry.w,
    d = rot % 2 ? entry.w : entry.d;
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}
type Box = { x0: number; x1: number; z0: number; z1: number };
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
/** The house plot and the walkway from the house to the Skyferry dock stay clear. */
export function reservedBoxes(home: HomeState): Box[] {
  const h = HOUSE_YARD,
    r = homeRadius(home);
  return [
    { x0: -h, x1: h, z0: -h, z1: h },
    { x0: -(r + 2), x1: -h, z0: -1.25, z1: 1.25 },
  ];
}
export function placementError(home: HomeState, entry: CatalogEntry, x: number, z: number, rot: number, ignore?: string) {
  if (![0, 1, 2, 3].includes(rot)) return "Choose a rotation.";
  const box = footprint(entry, x, z, rot),
    r = homeRadius(home) - 0.6;
  for (const [cx, cz] of [[box.x0, box.z0], [box.x1, box.z0], [box.x0, box.z1], [box.x1, box.z1]])
    if (Math.hypot(cx, cz) > r) return "That spot is past the edge of your land.";
  if (reservedBoxes(home).some((b) => overlaps(b, box))) return "Keep the house and the dock path clear.";
  for (const other of home.items) {
    if (other.uid === ignore) continue;
    const e = catalogEntry(other.kind);
    if (e && overlaps(box, footprint(e, other.x, other.z, other.rot))) return "Something is already there.";
  }
  return null;
}
/** Solid ground on the Home island: inside the land, outside the house and placed items. */
export function homeWalkable(home: HomeState, x: number, z: number) {
  if (Math.hypot(x, z) > homeRadius(home) - 0.7) return false;
  const h = houseHalf(home);
  if (Math.abs(x) < h && Math.abs(z) < h) return false;
  for (const item of home.items) {
    const e = catalogEntry(item.kind);
    if (!e || e.kind === "flowers") continue;
    const b = footprint(e, item.x, item.z, item.rot);
    if (x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2) return false;
  }
  return true;
}
/** Half the footprint of the house itself at its current level. */
export const houseHalf = (home: HomeState) => 2.3 + home.house * 0.3;
export const defaultHome = (): HomeState => ({
  expansion: 0,
  house: 0,
  items: [],
  residents: {},
  collected: {},
  seq: 0,
});

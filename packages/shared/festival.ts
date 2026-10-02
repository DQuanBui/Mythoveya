// Lanternfair Isle: the festival island's layout, daily rotation, hunt and ticket shop.
import type { Profile } from "./types";
import { utcDay, utcWeek } from "./town";

export const FESTIVAL_RADIUS = 25;
export type FestivalState = {
  tickets: number;
  /** Day the daily counters below belong to. */
  day: string;
  hunt: string[];
  greeted?: boolean;
  /** Ticket-earning runs played today, per activity. */
  plays: Record<string, number>;
  /** Personal bests: lowest time in ms for races, highest score otherwise. */
  best: Record<string, number>;
  outfits: string[];
  outfit?: string;
  week: string;
  bought: Record<string, number>;
  /** The game in progress, so a run can't claim to be faster than real time. */
  started?: { activity: string; at: number };
};
export const defaultFestival = (now = Date.now()): FestivalState => ({
  tickets: 0,
  day: utcDay(now),
  hunt: [],
  plays: {},
  best: {},
  outfits: [],
  week: utcWeek(now),
  bought: {},
});
/** Returns the festival state with daily and weekly counters rolled over. */
export function festivalOf(p: Profile, now = Date.now()) {
  const f = (p.festival ||= defaultFestival(now));
  const day = utcDay(now),
    week = utcWeek(now);
  if (f.day !== day) Object.assign(f, { day, hunt: [], plays: {}, greeted: false });
  if (f.week !== week) Object.assign(f, { week, bought: {} });
  return f;
}
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** A small deterministic generator; the same seed gives every player the same day. */
export function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}
export const daySeed = (day: string, salt: string) => hash(`${day}:${salt}`);

// Island layout. The dock is on the west shore like every island.
export const FESTIVAL_PLACES = {
  board: [-7, -3.5] as [number, number],
  shop: [-7, 5] as [number, number],
  race: [0, -9] as [number, number],
  course: [11, -5] as [number, number],
  fishing: [7, 9.5] as [number, number],
  carousel: [-3, 14] as [number, number],
  striker: [6, 17] as [number, number],
  confetti: [-14, 9] as [number, number],
  wheel: [16, 15] as [number, number],
  tree: [0, 0] as [number, number],
};
export const FESTIVAL_TRACK = { x: 0, z: -15.5, rx: 10, rz: 5.5 };
export const FESTIVAL_POND = { x: 13, z: 9.5, rx: 4.5, rz: 3.2 };
/** Solid attractions as circles the keeper walks around. */
export const FESTIVAL_OBSTACLES: { x: number; z: number; r: number }[] = [
  { x: 0, z: 0, r: 1.7 },
  { x: -7, z: -5, r: 1.2 },
  { x: -7, z: 6.6, r: 1.6 },
  { x: -3, z: 14, r: 3.1 },
  { x: 6, z: 18.2, r: 0.8 },
  { x: -14, z: 9, r: 0.9 },
  { x: 16, z: 15, r: 3.2 },
  { x: 7, z: 11.2, r: 1 },
  { x: 11, z: -7, r: 1 },
  { x: -1.8, z: -9.5, r: 0.5 },
  { x: 1.8, z: -9.5, r: 0.5 },
];
export function festivalWalkable(x: number, z: number) {
  if (Math.hypot(x, z) > FESTIVAL_RADIUS - 0.8) return false;
  const p = FESTIVAL_POND;
  if (((x - p.x) / (p.rx + 0.3)) ** 2 + ((z - p.z) / (p.rz + 0.3)) ** 2 < 1) return false;
  return !FESTIVAL_OBSTACLES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r);
}

// The daily lantern hunt: five of these spots, chosen by the date.
export const HUNT_SPOTS = [
  { id: "bunting", point: [-11, -10] as [number, number], clue: "Where the bunting crosses above the north path." },
  { id: "wheelfoot", point: [12, 19.5] as [number, number], clue: "In the shadow of the great wheel." },
  { id: "pondreeds", point: [17.5, 7] as [number, number], clue: "Among the reeds on the far side of the tournament pond." },
  { id: "trackbend", point: [-10.5, -18.5] as [number, number], clue: "Past the west bend of the race track." },
  { id: "dockpost", point: [-19.5, 4] as [number, number], clue: "By the lantern posts near the ferry landing." },
  { id: "carouselback", point: [-7.5, 18] as [number, number], clue: "Behind the carousel, where the music is quietest." },
  { id: "strikerbell", point: [9, 20] as [number, number], clue: "Close to the high striker's bell." },
  { id: "lanterntree", point: [2.4, 3.2] as [number, number], clue: "Under the great lantern tree's south boughs." },
  { id: "coursegate", point: [15.5, -9] as [number, number], clue: "Just beyond the obstacle course's last hurdle." },
  { id: "confetti", point: [-17, 12.5] as [number, number], clue: "Where the confetti cannon is pointing." },
  { id: "eastcliff", point: [21.5, -3] as [number, number], clue: "At the eastern cliff, facing the morning sun." },
  { id: "northtent", point: [5, -21] as [number, number], clue: "Beside the striped tent at the north edge." },
];
export const HUNT_DAILY = 5;
export const HUNT_TICKETS = 3;
export const HUNT_BONUS = 10;
export function huntSpots(day: string) {
  const random = seededRandom(daySeed(day, "hunt")),
    pool = [...HUNT_SPOTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, HUNT_DAILY);
}
export const GREETING_TICKETS = 2;

// The ticket shop: home decorations, keeper outfits, companion accessories and weekly supplies.
export type ShopEntry = {
  id: string;
  kind: "decor" | "outfit" | "accessory" | "supply";
  name: string;
  icon: string;
  tickets: number;
  description: string;
  /** Weekly purchase limit for supplies. */
  weekly?: number;
  gives?: { item: string; count: number };
};
export const FESTIVAL_SHOP: ShopEntry[] = [
  { id: "lantern-arch", kind: "decor", name: "Lantern arch", icon: "∩", tickets: 30, description: "A 3×1 arch strung with festival lanterns that glow at night." },
  { id: "balloon-cart", kind: "decor", name: "Balloon cart", icon: "◍", tickets: 40, description: "A 2×2 vendor cart tied with a bunch of bobbing balloons." },
  { id: "festival-tent", kind: "decor", name: "Striped tent", icon: "⛺", tickets: 55, description: "A 3×3 striped tent with a pennant on top." },
  { id: "mini-carousel", kind: "decor", name: "Little carousel", icon: "✺", tickets: 80, description: "A 3×3 carousel that turns slowly all day." },
  { id: "lantern-hat", kind: "outfit", name: "Paper lantern hat", icon: "✦", tickets: 35, description: "A glowing paper lantern hat for your keeper." },
  { id: "wreath", kind: "outfit", name: "Festival wreath", icon: "✿", tickets: 25, description: "A crown of fresh flowers and ribbons." },
  { id: "star-crown", kind: "outfit", name: "Star crown", icon: "✶", tickets: 60, description: "A golden crown of little stars." },
  { id: "festival-cape", kind: "outfit", name: "Festival cape", icon: "▼", tickets: 50, description: "A short cape in festival stripes." },
  { id: "crown", kind: "accessory", name: "Tiny crown", icon: "♔", tickets: 30, description: "A tiny golden crown for any companion." },
  { id: "scarf", kind: "accessory", name: "Lantern scarf", icon: "≋", tickets: 20, description: "A warm striped scarf for any companion." },
  { id: "flower", kind: "accessory", name: "Fair flower", icon: "❀", tickets: 15, description: "A big festival flower to wear behind one ear." },
  { id: "treat", kind: "supply", name: "Treat basket", icon: "♡", tickets: 10, weekly: 5, gives: { item: "treat", count: 3 }, description: "Three companion treats." },
  { id: "dust", kind: "supply", name: "Forge dust", icon: "⁂", tickets: 25, weekly: 3, gives: { item: "dust", count: 6 }, description: "Six measures of forge dust." },
  { id: "elixir", kind: "supply", name: "Growth elixir", icon: "⚱", tickets: 60, weekly: 2, gives: { item: "elixir", count: 1 }, description: "Gives a companion 250 creature XP." },
  { id: "crystal", kind: "supply", name: "Rift crystal", icon: "✧", tickets: 80, weekly: 1, gives: { item: "crystal", count: 1 }, description: "A shard of the rift for evolving." },
];
export const OUTFITS = FESTIVAL_SHOP.filter((s) => s.kind === "outfit").map((s) => s.id);

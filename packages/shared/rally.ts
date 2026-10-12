import type { Profile } from "./types";
export const RALLY_HOSTS = [
  {
    region: "haven",
    id: "rally-haven",
    name: "Piper's sky-post",
    host: "Piper",
    role: "Wayfarer coordinator",
    avatar: 6,
    point: [0, 14] as [number, number],
    color: "#e7ba67",
    species: "sunquill",
    element: "Storm",
    description:
      "Collect your travel passport and help the sky-post welcome migrating companions.",
    clue: "Sunquill follows bright cloth above the post. Which marker guides its flight?",
    options: [
      "A ribbon above the trail",
      "A stone under the water",
      "A closed crate",
    ],
    answer: 0,
    story:
      "I used to count journeys by the miles. Now I count the people who make room at their table. Every stamp is a promise that someone will welcome you back.",
  },
  {
    region: "meadow",
    id: "rally-meadow",
    name: "Nessa's picnic glade",
    host: "Nessa",
    role: "Woodland herbalist",
    avatar: 4,
    point: [12, 23] as [number, number],
    color: "#c997b7",
    species: "bramblebun",
    element: "Grove",
    description:
      "Help Nessa prepare a shaded picnic for the woodland's newest arrivals.",
    clue: "Bramblebun keeps its berries cool beneath the leaves. Where should its picnic rest?",
    options: ["On the hottest rock", "In a shaded clearing", "In deep water"],
    answer: 1,
    story:
      "Bramblebun plants a seed whenever a friend shares lunch. I keep a map of our picnics; in spring, the map becomes a garden.",
  },
  {
    region: "canyon",
    id: "rally-canyon",
    name: "Orrin's cooling camp",
    host: "Orrin",
    role: "Travelling potter",
    avatar: 7,
    point: [0, 14] as [number, number],
    color: "#db9464",
    species: "kilnback",
    element: "Tide",
    description:
      "Prepare cool drinking bowls for Kilnback caravans crossing the warm canyon.",
    clue: "Kilnback's glowing vents need room to breathe. What makes a safe resting place?",
    options: ["A sealed box", "A pile of dry leaves", "An open stone shelter"],
    answer: 2,
    story:
      "I learned pottery from watching Kilnback cool its shell one plate at a time. A strong bowl, like a strong friendship, cannot be rushed.",
  },
  {
    region: "hollow",
    id: "rally-hollow",
    name: "Edda's moth watch",
    host: "Edda",
    role: "Night-sky naturalist",
    avatar: 5,
    point: [12, 23] as [number, number],
    color: "#9dafe0",
    species: "frostmoth",
    element: "Flame",
    description:
      "Warm a sheltered rest stop and welcome the violet-winged Frostmoth migration.",
    clue: "Frostmoth rests where the wind cannot fold its delicate wings. Which place offers shelter?",
    options: [
      "Behind a windbreak",
      "On an exposed ridge",
      "In a rushing stream",
    ],
    answer: 0,
    story:
      "People think the quietest nights are empty. Watch the lanterns: a hundred little wings carry the sky from one shelter to the next.",
  },
] as const;
export type RallyHost = (typeof RALLY_HOSTS)[number];
export const rallyHost = (region: string) =>
  RALLY_HOSTS.find((h) => h.region === region);
export const rallyDay = (now = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);
export function rallyActivity(region: string, now = Date.now()) {
  const index = RALLY_HOSTS.findIndex((h) => h.region === region);
  const day = Math.floor(now / 86400000);
  const kind = (["care", "survey", "signal"] as const)[
    (((day + index) % 3) + 3) % 3
  ];
  return {
    day: rallyDay(now),
    kind,
    signal: [(day + index) % 3, (day + index + 1) % 3, (day + index + 2) % 3],
    name: {
      care: "Companion care",
      survey: "Trail survey",
      signal: "Signal practice",
    }[kind],
  };
}
export type RallyState = {
  day: string;
  completed: string[];
  stamps: string[];
  finished: boolean;
};
export const emptyRally = (now = Date.now()): RallyState => ({
  day: rallyDay(now),
  completed: [],
  stamps: [],
  finished: false,
});
export function rallyOf(p: Profile, now = Date.now()): RallyState {
  const r = p.rally || emptyRally(now);
  return {
    ...r,
    completed: r.day === rallyDay(now) ? r.completed : [],
    day: rallyDay(now),
  };
}
export const SIGNAL_NAMES = ["Sun", "Leaf", "Star"];

export const rallyProp = (h: RallyHost): [number, number] => [
  h.point[0] + 3,
  h.point[1] - 3,
];
export function rallyBlocked(region: string, x: number, z: number) {
  const h = rallyHost(region);
  if (!h) return false;
  const [a, b] = rallyProp(h);
  return (
    (Math.abs(x - a) < 1.2 && Math.abs(z - b) < 0.6) ||
    [-1.6, 1.6].some((dx) =>
      [-1, 1].some((dz) => Math.hypot(x - a - dx, z - b - dz) < 0.18),
    )
  );
}

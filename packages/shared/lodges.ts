import type { Profile } from "./types";
import type { FieldAbility } from "./rescue";
export type LodgeRecord = {
  met: boolean;
  meal?: string;
  helper?: { id: string; species: string };
  keepsake?: "lantern" | "banner";
};
export type LodgeState = {
  rooms: Record<string, LodgeRecord>;
  claims: string[];
};
export type Lodge = {
  id: string;
  region: string;
  name: string;
  host: string;
  avatar: number;
  point: [number, number];
  color: string;
  wall: string;
  story: string;
  recipe: string;
  ingredients: string[];
  answer: number;
  ability: FieldAbility;
  task: string;
  ending: string;
  species: string;
};
export const LODGES: Lodge[] = [
  {
    id: "lodge-haven",
    region: "haven",
    name: "Cloudwatch common room",
    host: "Perrin",
    avatar: 3,
    point: [29, -19.5],
    color: "#739eae",
    wall: "#dbc6a7",
    story:
      "The rangers have returned from the ridge. Help me prepare a welcome supper, and leave a light for the next traveler.",
    recipe: "Cloudberry tea",
    ingredients: [
      "Cloudberries and spring water",
      "Ember pepper and ash",
      "Salt and pine needles",
    ],
    answer: 0,
    ability: "beacon",
    task: "Warm the hearth gently with a Flame or Light companion.",
    ending:
      "The rangers trade stories under your decoration. Even the shy little Lumeswallow comes down from the rafters.",
    species: "lumeswallow",
  },
  {
    id: "lodge-meadow",
    region: "meadow",
    name: "Fernrest kitchen",
    host: "Junie",
    avatar: 1,
    point: [19, 14],
    color: "#84a877",
    wall: "#d9d8b3",
    story:
      "The choir is rehearsing outside. A fresh woodland supper will bring everyone together when the singing ends.",
    recipe: "Dewleaf broth",
    ingredients: [
      "Dry bark and salt",
      "Dewleaf and spring water",
      "Frost salt and embers",
    ],
    answer: 1,
    ability: "nurture",
    task: "Refresh the herb garden with a Tide or Grove companion.",
    ending:
      "The windows fill with the sound of the choir. Your herbs flourish, and bowls of broth wait for the singers.",
    species: "lumeswallow",
  },
  {
    id: "lodge-canyon",
    region: "canyon",
    name: "Copperkettle shelter",
    host: "Saff",
    avatar: 6,
    point: [-24, 26],
    color: "#c28a63",
    wall: "#ddbf9a",
    story:
      "Our surveyors are coming home with dusty boots. The kettle is ready, but the serving bench needs a steady paw.",
    recipe: "Sunroot stew",
    ingredients: [
      "Ice chips and mint",
      "Cinder dust and thorns",
      "Sunroot and ember pepper",
    ],
    answer: 2,
    ability: "brace",
    task: "Steady the serving bench with a Stone or Frost companion.",
    ending:
      "The surveyors settle around the table. The room fills with spice and laughter, far from the restless canyon wind.",
    species: "velvetmoth",
  },
  {
    id: "lodge-hollow",
    region: "hollow",
    name: "Snowquilt reading room",
    host: "Nell",
    avatar: 0,
    point: [19, 13],
    color: "#8b99c1",
    wall: "#cbd6df",
    story:
      "A snowstorm delayed our book circle. Find the missing bell and brew something warm before our readers arrive.",
    recipe: "Moonmint cocoa",
    ingredients: [
      "Moonmint and cocoa",
      "Gravel and snow",
      "Bitter root and ash",
    ],
    answer: 0,
    ability: "scout",
    task: "Find the lost reading bell with a Storm or Shadow companion.",
    ending:
      "The bell rings softly. Readers gather under warm quilts while a Velvetmoth rests beside your new decoration.",
    species: "velvetmoth",
  },
];
export const lodgeOf = (p: Profile): LodgeState =>
  p.lodges || { rooms: {}, claims: [] };
export const lodgeRecord = (p: Profile, region: string): LodgeRecord =>
  lodgeOf(p).rooms[region] || { met: false };
export const lodgeCount = (p: Profile) =>
  LODGES.filter((s) => !!lodgeRecord(p, s.region).keepsake).length;
export const lodgeStops = (region: string) =>
  LODGES.filter((s) => s.region === region).map((s) => ({
    ...s,
    description:
      "Enter a walkable lodge: meet its host, cook, and help with a companion.",
  }));
export const ROOM_SPAWN: [number, number] = [0, 5.5];
export const ROOM_STATIONS = [
  { id: "host", name: "Meet the host", point: [-4, -4] as [number, number] },
  { id: "kitchen", name: "Prepare supper", point: [4, -4] as [number, number] },
  {
    id: "companion",
    name: "Companion corner",
    point: [-4, 2] as [number, number],
  },
  {
    id: "guestbook",
    name: "Gathering book",
    point: [4, 2] as [number, number],
  },
  { id: "exit", name: "Return outdoors", point: ROOM_SPAWN },
];
/** Rendered furniture footprints, with keeper clearance added by roomWalkable. */
export const ROOM_FURNITURE = [
  { id: "table", x: 0, z: -1.5, w: 3, d: 2 },
  { id: "counter", x: 5.9, z: -4, w: 1.5, d: 3.6 },
  { id: "shelf", x: 5.9, z: 2, w: 1.4, d: 2.2 },
  { id: "bench", x: -5.9, z: 2, w: 1.4, d: 3 },
  { id: "hearth", x: -4, z: -6.8, w: 2.6, d: 1 },
];
/** Each region owns its furniture and station positions; rendering and walking
 * must use this same layout to avoid invisible obstacles or stale path grids. */
export function roomLayout(region: string) {
  const furniture = ROOM_FURNITURE.map((f) => ({ ...f }));
  const stations = ROOM_STATIONS.map((s) => ({ ...s, point: [...s.point] as [number, number] }));
  const move = (id: string, x: number, z: number) => {
    Object.assign(furniture.find((f) => f.id === id)!, { x, z });
  };
  const stop = (id: string, x: number, z: number) => {
    stations.find((s) => s.id === id)!.point = [x, z];
  };
  if (region === "meadow") {
    move("table", -1, -1); move("counter", 5.9, -2.5);
    move("shelf", 5.9, 3); move("bench", -5.9, 0.8);
    stop("host", -2, -4.2); stop("kitchen", 4, -2.5);
    stop("guestbook", 4, 3); stop("companion", -4, 2.5);
  } else if (region === "canyon") {
    move("table", 1, -0.5); move("shelf", -5.9, -2.2);
    move("bench", -5.9, 2.8);
    stop("host", -3, -4.8); stop("guestbook", -4, -2.2);
    stop("companion", -4, 3);
  } else if (region === "hollow") {
    move("table", 0, -3); move("counter", 5.9, -3);
    move("shelf", 5.9, 2.2); move("bench", -5.9, 0.8);
    stop("host", -4, -4.5); stop("kitchen", 4, -3);
    stop("companion", -4, 1); stop("guestbook", 4, 2.2);
  }
  const host = stations.find((s) => s.id === "host")!.point;
  return { furniture, stations, host: [host[0], host[1] - 1.2] as [number, number] };
}
const layouts = Object.fromEntries(LODGES.map((s) => [s.region, roomLayout(s.region)]));
export function roomWalkable(x: number, z: number, region = "haven") {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    Math.abs(x) < 6.6 &&
    Math.abs(z) < 7.3 &&
    !(layouts[region] || layouts.haven).furniture.some(
      (f) =>
        Math.abs(x - f.x) < f.w / 2 + 0.35 &&
        Math.abs(z - f.z) < f.d / 2 + 0.35,
    )
  );
}

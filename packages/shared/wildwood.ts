import type { Point } from "./haven";
import type { Owned, Profile } from "./types";
import { byId } from "./content";
import { worldHour } from "./world-time";
import { weatherAt } from "./weather";

export const WILDWOOD_LAKE = { x: -49, z: 12, rx: 8, rz: 6 };
export const WILDWOOD_PATHS: Point[][] = [
  [[-31, 12], [-36, 22], [-49, 22], [-61, 18], [-63, 6], [-61, 1], [-57, -6], [-42, -8], [-34, -11.5]],
  [[-57, -6], [-49, -6], [-49, -3]],
  [[-49, 22], [-49, 19]],
  [[8, 26], [4, 26], [2.8, 23]],
];
export const WILDWOOD_PLACES = [
  { id: "reedwater", name: "Reedwater Lake", short: "Reedwater", point: [-49, 22] as Point, color: "#78c6c7", description: "Dragonflies skim the reeds beneath copper-leaved willows. Tide companions can clear the old sluice.", species: ["ripplefin", "puddlepip"] },
  { id: "windrest", name: "Windrest Lookout", short: "Windrest", point: [-61, 1] as Point, color: "#c5a9d7", description: "A gentle climb to an astronomer's shelter, above the lake and mountain pines.", species: ["voltwing", "rimeowl"] },
  { id: "fieldstation", name: "Willow Field Station", short: "Field station", point: [-49, -3] as Point, color: "#deb982", description: "Two welcoming cottages keep the westward trails supplied with maps, lanterns and stories.", species: ["mossprig", "thornhare"] },
];
export const FIELD_HOUSES = [
  { id: "naturalist", name: "Mira's Field Station", point: [-49, -6] as Point, door: [-49, -3] as Point, roof: "#bd805b", story: "Mira sketches every leaf and feather she finds. She leaves a map of the lake for visiting keepers." },
  { id: "astronomer", name: "Orrin's Star Shelter", point: [-65, 1] as Point, door: [-61, 1] as Point, roof: "#76689f", story: "Orrin's telescope follows the drifting reaches. Tonight's star chart records a constellation shaped like your companion." },
];
export const FIELD_NODES = [
  { id: "brazier", name: "Emberlight beacon", point: [-42, -8] as Point, element: "Flame", ability: "Kindle", text: "Warm the beacon and recover the windmill's emberlight lens." },
  { id: "sluice", name: "Reedwater sluice", point: [-49, 19] as Point, element: "Tide", ability: "Flow", text: "Lift the silt from the channel and recover its waterwheel pin." },
  { id: "roots", name: "Rootbound spindle", point: [-36, 22] as Point, element: "Grove", ability: "Bloom", text: "Coax the roots apart to free the wooden spindle." },
] as const;
export const MILL_POINT: Point = [2.8, 23];
export const GUARDIAN_POINT: Point = [-61, 18];
export type Expedition = { started: boolean; repaired: string[]; guardian: boolean; restored: boolean; visits: string[]; discoveries: string[] };
export const emptyExpedition = (): Expedition => ({ started: false, repaired: [], guardian: false, restored: false, visits: [], discoveries: [] });
export const expeditionOf = (p: Profile) => p.expedition || emptyExpedition();
export function fieldCompanions(p: Profile, element: string): Owned[] {
  return p.owned.filter((o) => byId[o.species]?.element === element);
}
export function inReedwater(x: number, z: number, margin = 0) {
  const l = WILDWOOD_LAKE;
  return Math.hypot((x - l.x) / (l.rx + margin), (z - l.z) / (l.rz + margin)) < 1;
}
export function fieldStructureBlocked(x: number, z: number, pad = 0) {
  return FIELD_HOUSES.some((h) => Math.abs(x - h.point[0]) < 1.8 + pad && Math.abs(z - h.point[1]) < 1.8 + pad);
}
export function discoveryWindow(id: string, now: number) {
  if (id === "rainprints") return weatherAt(now).weather === "rain";
  if (id === "starglass") return worldHour(now) >= 18 || worldHour(now) < 6;
  return false;
}
export const DISCOVERIES = [
  { id: "rainprints", name: "Rain-written tracks", point: [-55, 22] as Point, clue: "After the rain begins, silver tracks appear on Reedwater's southern trail." },
  { id: "starglass", name: "Starglass constellation", point: [-61, 1] as Point, clue: "Between 18:00 and 06:00 island time, the lookout catches falling starlight." },
];
export function expeditionObjective(p: Profile) {
  const e = expeditionOf(p);
  if (!e.started) return { id: "mill", title: "The Silent Windmill", text: "Visit the windmill beside Sunpetal Clearing." };
  const node = FIELD_NODES.find((n) => !e.repaired.includes(n.id));
  if (node) return { id: node.id, title: node.name, text: `${node.ability}: bring any ${node.element} companion. ${node.text}` };
  if (!e.guardian) return { id: "guardian", title: "The restless guardian", text: "Meet the guardian on Reedwater's western trail. Break its guard when the core opens." };
  if (!e.restored) return { id: "mill", title: "Let the village sing again", text: "Return to the windmill to fit the recovered pieces." };
  return { id: "mill", title: "A wind worth remembering", text: "The sails turn again. Explore the lake, visit the field houses and discover weather secrets." };
}

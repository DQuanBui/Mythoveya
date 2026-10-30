import type { Profile } from "./types";
import { byId } from "./content";
import { lodgeCount } from "./lodges";

// Lifetime milestones, read straight from the save (nothing extra is stored).
// Each completed milestone grants a title; the keeper badge shows the most
// prestigious one, which is the last completed entry in this list.
export type Milestone = {
  id: string;
  title: string;
  text: string;
  goal: number;
  value: (p: Profile) => number;
};
const chapters = (p: Profile) =>
  Object.entries(p.adventure?.stages || {}).filter(([id, stars]) => /^c\d+-4$/.test(id) && stars > 0).length;

export const MILESTONES: Milestone[] = [
  { id: "team", title: "Bondmaker", text: "Gather a full team of six companions.", goal: 6, value: (p) => p.owned.length },
  { id: "stamps", title: "Good Neighbour", text: "Sign all six Havenreach visitor books.", goal: 6, value: (p) => p.town?.stamps?.length || 0 },
  { id: "wins", title: "Brave Heart", text: "Win 25 battles.", goal: 25, value: (p) => p.wins },
  { id: "caches", title: "Treasure Seeker", text: "Open all eight Skyglass caches.", goal: 8, value: (p) => p.town?.caches?.length || 0 },
  { id: "evolve", title: "Evolver", text: "Evolve a companion.", goal: 1, value: (p) => (p.owned.some((o) => byId[o.species]?.evolvedFrom) ? 1 : 0) },
  { id: "shimmer", title: "Starcatcher", text: "Befriend a shimmering companion.", goal: 1, value: (p) => (p.owned.some((o) => o.shimmer) ? 1 : 0) },
  { id: "season", title: "Lantern Seeker", text: "Find every lantern of a seasonal festival.", goal: 1, value: (p) => p.seasons?.done.length || 0 },
  { id: "lodges", title: "Hearth Host", text: "Host a gathering at all four Wayfarer Lodges.", goal: 4, value: lodgeCount },
  { id: "guardians", title: "Guardian Friend", text: "Calm four region guardians.", goal: 4, value: (p) => p.bosses.length },
  { id: "collector", title: "Collector", text: "Befriend 30 different species.", goal: 30, value: (p) => new Set(p.owned.map((o) => o.species)).size },
  { id: "level", title: "Seasoned Keeper", text: "Reach keeper level 20.", goal: 20, value: (p) => p.level },
  { id: "tower", title: "Tower Climber", text: "Clear floor 20 of the Rift Tower.", goal: 20, value: (p) => p.adventure?.tower || 0 },
  { id: "riftgate", title: "Rift Warden", text: "Calm the guardian of all eight Riftgate chapters.", goal: 8, value: chapters },
];

export const milestoneProgress = (p: Profile) =>
  MILESTONES.map((m) => {
    const value = Math.min(m.goal, m.value(p));
    return { ...m, value, done: value >= m.goal };
  });
/** The most prestigious title earned so far, if any. */
export const keeperTitle = (p: Profile) =>
  milestoneProgress(p)
    .filter((m) => m.done)
    .at(-1)?.title;

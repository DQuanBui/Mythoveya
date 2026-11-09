// Who turns up in a wild encounter. Each region keeps its familiar six, and the
// time of day and the weather bring others out: night owls, rain lovers, early
// risers. Time and weather come from the shared clocks, so the server decides.
import { byId } from "./content";
import { regionWeather, weatherAt } from "./weather";
import { worldHour } from "./world-time";

export type WildTime = "night" | "dawn" | "rain" | "mist";
export const BASE_WILD: Record<string, string[]> = {
  haven: ["mossprig", "pebblit", "puddlepip", "cindermite", "zippinch", "thornhare"],
  canyon: ["magmole", "cragpup", "voltwing", "flintuff", "cindermite", "emberfox"],
  hollow: ["snowmew", "shadecko", "glimlet", "frostwhisk", "duskblob", "rimeowl"],
};
/** Creatures that only come out at certain times, by region. Ids are stable. */
export const SPECIAL_WILD: Record<string, Partial<Record<WildTime, string[]>>> = {
  haven: {
    night: ["duskblob", "shadecko", "lanternmoth"],
    dawn: ["dawnfawn", "glimlet"],
    rain: ["bubbloom", "reedlet", "coralisk"],
    mist: ["prismoth", "wickwaddle"],
  },
  meadow: {
    night: ["lanternmoth", "duskblob"],
    dawn: ["dawnfawn", "glimlet"],
    rain: ["reedlet", "bubbloom"],
    mist: ["prismoth", "chimewing"],
  },
  canyon: {
    night: ["murkfang", "shadecko"],
    dawn: ["wickwaddle", "dawnfawn"],
    mist: ["nimbuskit", "chimewing"],
  },
  hollow: {
    night: ["murkfang", "lanternmoth"],
    dawn: ["dawnfawn", "prismoth"],
    rain: ["velvetrime", "chimewing"],
    mist: ["velvetrime", "nimbuskit"],
  },
};
export const WILD_TIME_NAMES: Record<WildTime, string> = { night: "at night", dawn: "at dawn", rain: "in the rain", mist: "in the mist" };
const REGION_NAMES: Record<string, string> = { haven: "Havenreach", meadow: "Whisperleaf", canyon: "Emberglass", hollow: "Moonfrost" };

/** Newcomers are higher-tier than the familiar six and grow faster, so they
 * come in below the usual level (measured with simulated battles). */
export const specialLevel = (level: number) => Math.max(1, Math.round(level * 0.6));
/** What is true of the wild right now in a region. */
export function wildTimes(region: string, now = Date.now()): WildTime[] {
  const hour = worldHour(now),
    weather = regionWeather(weatherAt(now).weather, region),
    times: WildTime[] = [];
  if (hour >= 19.5 || hour < 5) times.push("night");
  else if (hour < 8) times.push("dawn");
  if (weather === "rain") times.push("rain");
  if (weather === "mist") times.push("mist");
  return times;
}
/** The creatures out only now, in the region. */
export function specialsNow(region: string, times: WildTime[]) {
  return [...new Set(times.flatMap((t) => SPECIAL_WILD[region]?.[t] || []))];
}
/** Wins before newcomers turn up: a keeper's first battles, where even the
 * familiar six are an even match, stay as they were until other regions open. */
export const NEWCOMER_WINS = 5;
/** The six a wild encounter brings: the familiar faces, with up to two of
 * whoever is out only now, once the keeper has found their feet. */
export function wildLineup(region: string, times: WildTime[], wins: number, random: () => number) {
  const base = BASE_WILD[region] || BASE_WILD.haven,
    pool = wins < NEWCOMER_WINS ? [] : specialsNow(region, times).filter((s) => !base.includes(s)),
    picked: string[] = [];
  while (picked.length < 2 && pool.length) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return { species: [...base.slice(0, 6 - picked.length), ...picked], specials: picked };
}
/** Which wild creature offers to bond after a win: a creature that is out
 * only now if one came, otherwise the first that is humble enough to bond. */
export function bondCandidate(species: string[], specials: string[]) {
  const humble = (s: string) => ["E", "D", "C"].includes(byId[s].tier);
  return specials.find(humble) ?? species.find(humble);
}
/** Where and when a creature can be met in the wild, in words. */
export function wildHints(species: string) {
  const out: string[] = [];
  for (const region of Object.keys(REGION_NAMES)) {
    if ((BASE_WILD[region] || (region === "meadow" ? BASE_WILD.haven : [])).includes(species)) out.push(`${REGION_NAMES[region]}, any time`);
    for (const [time, list] of Object.entries(SPECIAL_WILD[region] || {}))
      if (list?.includes(species)) out.push(`${REGION_NAMES[region]}, ${WILD_TIME_NAMES[time as WildTime]}`);
  }
  return out;
}
/** Every creature that turns up only at certain times, anywhere. */
export const SPECIAL_SPECIES = [...new Set(Object.values(SPECIAL_WILD).flatMap((r) => Object.values(r).flat()))] as string[];
/** The Journal's "when to meet" filter: "" for all, "now" for who is out where
 * the keeper is, or a time such as "night" anywhere. */
export function matchesWildFilter(species: string, filter: string, region: string, times: WildTime[]) {
  if (!filter) return true;
  if (filter === "now") return specialsNow(region, times).includes(species);
  return Object.values(SPECIAL_WILD).some((r) => r[filter as WildTime]?.includes(species));
}
/** Notes the creatures met in a battle in the keeper's Journal. */
export function noteSeen(p: { seen?: string[] }, species: string[]) {
  const seen = new Set(p.seen || []);
  for (const s of species) seen.add(s);
  if (seen.size !== (p.seen?.length || 0)) p.seen = [...seen];
}
/** Every species the keeper has met or befriended. */
export const seenOrOwned = (p: { seen?: string[]; owned: { species: string }[] }) =>
  new Set([...(p.seen || []), ...p.owned.map((o) => o.species)]);
/** How many levels below the keeper wild creatures fight. New keepers get a
 * wider margin while they learn, easing to the usual one by their tenth win
 * (measured with simulated keepers). */
export const wildLevelGap = (wins: number) => (wins < 10 ? 2 : 1);
/** Softer wild creatures in a keeper's first battles: the very first at half
 * strength, as it always was, a gentler step for the next two, and a taper
 * from the tenth win to the twentieth as the level margin narrows. */
export function wildEase(wins: number) {
  if (wins === 0) return { hp: 0.5, attack: 0.6 };
  if (wins < 3) return { hp: 0.8, attack: 0.85 };
  // Past the wider level margin, ease off gradually rather than all at once.
  if (wins >= 10 && wins < 20) return { hp: 0.8 + (wins - 10) * 0.02, attack: 0.85 + (wins - 10) * 0.015 };
  return null;
}

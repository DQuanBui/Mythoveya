// Login calendar plus weekly and monthly missions. Progress counters reset with their period.
import type { Profile } from "./types";
import type { Reward } from "./adventure";

export type EventReward = Reward & { gear?: number };
export type Metric =
  | "wins"
  | "stages"
  | "dungeons"
  | "resources"
  | "fish"
  | "train"
  | "caches"
  | "recruits"
  | "forge"
  | "evolve"
  | "stars"
  | "arena"
  | "visits";
export type EventMission = {
  id: string;
  title: string;
  metric: Metric;
  goal: number;
  reward: EventReward;
};
export type EventState = {
  login: { day: number; last: string };
  week: string;
  month: string;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  claimed: string[];
};

/** Thirty login rewards; gear values are the guaranteed rarity (1 Rare, 2 Epic, 3 Legendary). */
export const LOGIN_REWARDS: EventReward[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  if (day === 30) return { diamonds: 300, gear: 3, crystal: 3 };
  if (day === 21) return { diamonds: 150, gear: 2, tome: 3 };
  if (day === 14) return { diamonds: 120, gear: 2, crystal: 2 };
  if (day === 7) return { diamonds: 80, gear: 1, elixir: 2 };
  return [
    { gold: 150 },
    { diamonds: 30 },
    { tome: 1, gold: 80 },
    { dust: 6 },
    { elixir: 1, gold: 60 },
    { diamonds: 40 },
    { crystal: 1, gold: 100 },
  ][i % 7];
});
export const WEEKLY: EventMission[] = [
  { id: "w-wins", title: "Win 15 battles", metric: "wins", goal: 15, reward: { diamonds: 60, gold: 200 } },
  { id: "w-stages", title: "Clear 5 story stages", metric: "stages", goal: 5, reward: { tome: 2, gold: 150 } },
  { id: "w-dungeons", title: "Complete 8 dungeon runs", metric: "dungeons", goal: 8, reward: { diamonds: 50, dust: 8 } },
  { id: "w-gather", title: "Gather 12 Sunseed", metric: "resources", goal: 12, reward: { gold: 180, elixir: 1 } },
  { id: "w-fish", title: "Catch 6 fish", metric: "fish", goal: 6, reward: { gold: 150, crystal: 1 } },
  { id: "w-train", title: "Train companions 5 times", metric: "train", goal: 5, reward: { tome: 1, gold: 120 } },
];
export const WEEKLY_CHEST: EventReward = { diamonds: 150, crystal: 2, gear: 1 };
export const MONTHLY: EventMission[] = [
  { id: "m-wins", title: "Win 60 battles", metric: "wins", goal: 60, reward: { diamonds: 200, gold: 600 } },
  { id: "m-dungeons", title: "Complete 30 dungeon runs", metric: "dungeons", goal: 30, reward: { diamonds: 180, gear: 2 } },
  { id: "m-stars", title: "Earn 24 stage stars", metric: "stars", goal: 24, reward: { crystal: 4, tome: 3 } },
  { id: "m-recruit", title: "Make 10 bonds at the shrine", metric: "recruits", goal: 10, reward: { diamonds: 150 } },
  { id: "m-forge", title: "Forge equipment 10 times", metric: "forge", goal: 10, reward: { dust: 30, gold: 500 } },
  { id: "m-evolve", title: "Evolve a companion", metric: "evolve", goal: 1, reward: { crystal: 3, diamonds: 100 } },
  { id: "m-caches", title: "Open 3 Skyglass caches", metric: "caches", goal: 3, reward: { diamonds: 120, elixir: 3 } },
  { id: "m-arena", title: "Finish 5 arena matches", metric: "arena", goal: 5, reward: { diamonds: 120, gold: 300 } },
];
export const MONTHLY_CHEST: EventReward = { diamonds: 400, gear: 3, crystal: 4 };

export const utcMonth = (now = Date.now()) =>
  new Date(now).toISOString().slice(0, 7);
export function weekKey(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function ensureEvents(p: Profile, now = Date.now()): EventState {
  p.events ||= {
    login: { day: 0, last: "" },
    week: weekKey(now),
    month: utcMonth(now),
    weekly: {},
    monthly: {},
    claimed: [],
  };
  const e = p.events;
  if (e.week !== weekKey(now)) {
    e.week = weekKey(now);
    e.weekly = {};
    e.claimed = e.claimed.filter((id) => !id.startsWith("w-") && id !== "weekly-chest");
  }
  if (e.month !== utcMonth(now)) {
    e.month = utcMonth(now);
    e.monthly = {};
    e.claimed = e.claimed.filter((id) => !id.startsWith("m-") && id !== "monthly-chest");
  }
  return e;
}
/** Records progress toward weekly and monthly missions. */
export function track(p: Profile, metric: Metric, n = 1, now = Date.now()) {
  const e = ensureEvents(p, now);
  e.weekly[metric] = (e.weekly[metric] || 0) + n;
  e.monthly[metric] = (e.monthly[metric] || 0) + n;
}
export function missionDone(e: EventState, m: EventMission) {
  return ((m.id.startsWith("w-") ? e.weekly : e.monthly)[m.metric] || 0) >= m.goal;
}
export const loginReady = (e: EventState, today: string) => e.login.last !== today;
export function nextLoginDay(e: EventState) {
  return (e.login.day % 30) + 1;
}
/** Anything claimable right now, for the HUD badge. */
export function eventsReady(p: Profile, today: string, now = Date.now()) {
  if (!p.events) return true;
  const e = { ...p.events };
  if (e.week !== weekKey(now) || e.month !== utcMonth(now)) return true;
  if (loginReady(e, today)) return true;
  return [...WEEKLY, ...MONTHLY].some((m) => missionDone(e, m) && !e.claimed.includes(m.id));
}

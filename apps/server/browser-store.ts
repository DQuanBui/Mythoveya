import type { Profile } from "../../packages/shared/types";
import { resetDaily } from "../../packages/shared/economy";
import { ensureTown, utcDay } from "../../packages/shared/town";
import { newProfile } from "./new-profile";
// Browser stand-in for store.ts, used by the standalone (GitHub Pages) build.
// It exposes the same functions to the game modules but keeps one keeper's
// save in localStorage instead of SQLite. Saves stay in this browser.
export const STORAGE_KEY = "mythoveya-standalone-save";
// Operation results only guard against an immediate retry, so a short
// history is enough and keeps browser storage small.
const KEEP_OPERATIONS = 40,
  KEEP_MATCHES = 400;
type Run = { day: string; activity: string; profile: string; name: string; score: number; data: string };
type Tables = {
  profiles: Record<string, string>;
  tokens: Record<string, string>;
  operations: [key: string, result: string][];
  matches: string[];
  runs: Run[];
};
const empty = (): Tables => ({ profiles: {}, tokens: {}, operations: [], matches: [], runs: [] });
const memory = new Map<string, string>();
const storage = () =>
  (globalThis as { localStorage?: Pick<Storage, "getItem" | "setItem"> }).localStorage ?? {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  };
let tables: Tables | undefined,
  depth = 0;
function state() {
  if (!tables) {
    try {
      tables = { ...empty(), ...JSON.parse(storage().getItem(STORAGE_KEY) || "{}") };
    } catch {
      tables = empty();
    }
  }
  return tables!;
}
function persist() {
  const t = state();
  t.operations = t.operations.slice(-KEEP_OPERATIONS);
  t.matches = t.matches.slice(-KEEP_MATCHES);
  const yesterday = utcDay(Date.now() - 86400000);
  t.runs = t.runs.filter((r) => r.day === "all" || r.day >= yesterday);
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    throw Error("Browser storage is full or blocked, so progress could not be saved.");
  }
}
/** Forgets the cached copy so the next call reads browser storage again. */
export function reloadStandaloneStore() {
  tables = undefined;
}
const hex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
export function createProfile(name: string, avatar: number) {
  const id = crypto.randomUUID(),
    token = hex(32);
  const p = newProfile(id, name, avatar);
  atomic(() => {
    state().profiles[id] = JSON.stringify(p);
    state().tokens[token] = id;
  });
  return { token, profile: p };
}
function load(id: string | undefined) {
  const data = id && state().profiles[id];
  if (!data) return undefined;
  const p = JSON.parse(data) as Profile;
  resetDaily(p);
  ensureTown(p);
  return p;
}
export function authenticate(token: string) {
  const p = load(state().tokens[token]);
  if (!p)
    throw Error(
      "Session expired. Create a new guest or restore your original browser token.",
    );
  return p;
}
export function getProfile(id: string) {
  const p = load(id);
  if (!p) throw Error("Profile not found");
  return p;
}
export function save(p: Profile) {
  if (!state().profiles[p.id]) return;
  state().profiles[p.id] = JSON.stringify(p);
  if (!depth) persist();
}
export function atomic<T>(work: () => T): T {
  if (depth) return work();
  const snapshot = JSON.stringify(state());
  depth++;
  try {
    const result = work();
    persist();
    return result;
  } catch (e) {
    tables = JSON.parse(snapshot);
    throw e;
  } finally {
    depth--;
  }
}
export function operation(
  token: string,
  id: string,
  work: (p: Profile) => unknown,
) {
  return atomic(() => {
    const p = authenticate(token);
    const key = `${p.id}|${id}`;
    const previous = state().operations.find(([k]) => k === key);
    if (previous) return JSON.parse(previous[1]);
    const value = work(p);
    save(p);
    const result = { profile: p, value };
    state().operations.push([key, JSON.stringify(result)]);
    return result;
  });
}
export function matchRecorded(id: string) {
  return state().matches.includes(id);
}
export function recordMatch(id: string, _result: unknown) {
  state().matches.push(id);
  if (!depth) persist();
}
/** Keeps each keeper's best festival run for the day and for all time. */
export function recordRun(
  day: string,
  activity: string,
  p: Profile,
  score: number,
  lowerIsBetter: boolean,
  data: unknown,
) {
  const t = state();
  for (const key of [day, "all"]) {
    const i = t.runs.findIndex((r) => r.day === key && r.activity === activity && r.profile === p.id);
    const row = t.runs[i];
    if (row && (lowerIsBetter ? row.score <= score : row.score >= score)) continue;
    const run = { day: key, activity, profile: p.id, name: p.name, score, data: JSON.stringify(data) };
    if (row) t.runs[i] = run;
    else t.runs.push(run);
  }
  if (!depth) persist();
}
export function topRuns(day: string, activity: string, lowerIsBetter: boolean, limit = 10) {
  return state()
    .runs.filter((r) => r.day === day && r.activity === activity)
    .sort((a, b) => (lowerIsBetter ? a.score - b.score : b.score - a.score))
    .slice(0, limit)
    .map(({ profile, name, score, data }) => ({ profile, name, score, data: JSON.parse(data) }));
}
export function allProfiles() {
  return Object.values(state().profiles).map((d) => JSON.parse(d) as Profile);
}

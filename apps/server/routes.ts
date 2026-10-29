import { z } from "zod";
import { allProfiles, authenticate, createProfile, operation, topRuns } from "./store";
import { utcDay } from "../../packages/shared/town";
import { ACTIVITIES, featuredActivity } from "../../packages/shared/festival-games";
import { mutate, pve, pveAction, pveBond, ranking, startPve } from "./game";
// Request validation and handlers shared by the Express server and the
// standalone browser build. Handlers throw; callers turn errors into
// responses with errorMessage().
export const token = (authorization?: string) =>
  z
    .string()
    .length(64)
    .parse((authorization || "").replace("Bearer ", ""));
export function errorMessage(err: unknown) {
  return err instanceof z.ZodError
    ? "Invalid request. Check the entered values."
    : (err as Error).message;
}
export function guest(body: unknown) {
  const v = z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(24)
        .regex(/^[\p{L}\p{N} _'-]+$/u),
      avatar: z.number().int().min(0).max(7),
    })
    .parse(body);
  return createProfile(v.name, v.avatar);
}
export const profile = (t: string) => authenticate(t);
const mutation = z.object({
  requestId: z.string().uuid(),
  companion: z.string().max(100).optional(),
  kind: z.enum([
    "lodge-meet", "lodge-cook", "lodge-help", "lodge-finish", "lodge-claim",
    "lodge-workshop", "lodge-decorate",
    "rescue-survey", "rescue-help", "rescue-finish", "rescue-claim",
    "atlas-start", "atlas-read", "atlas-solve", "atlas-finish", "atlas-echo",
    "cons-gather", "cons-craft", "cons-dismantle", "cons-install", "cons-tend", "cons-claim",
    "rally-complete", "rally-finish",
    "mea-start", "mea-sing", "mea-note", "mea-finish",
    "hol-start", "hol-gather", "hol-craft", "hol-install", "hol-finish", "hol-note",
    "can-start", "can-tune", "can-finish", "can-note", "can-field-reward",
    "exp-start", "exp-field", "exp-restore", "exp-visit", "exp-discover",
    "starter",
    "guide",
    "recruit",
    "formation",
    "claim",
    "resource",
    "train",
    "upgrade",
    "lock",
    "avatar",
    "travel",
    "daily",
    "bond",
    "town-talk",
    "town-visit",
    "town-claim",
    "town-helper",
    "town-buy",
    "town-sell",
    "town-plant",
    "town-harvest",
    "town-craft",
    "town-feed",
    "town-rename",
    "town-equip",
    "town-spar",
    "town-weekly",
    "town-track",
    "town-cache",
    "town-fish",
    "season-find",
    "skill-up",
    "gear-equip",
    "gear-remove",
    "gear-upgrade",
    "gear-salvage",
    "elixir",
    "chapter-chest",
    "evolve",
    "town-shop",
    "login-claim",
    "event-claim",
    "event-chest",
    "island-travel",
    "home-place",
    "home-move",
    "home-remove",
    "home-expand",
    "home-house",
    "home-assign",
    "home-unassign",
    "home-collect",
    "home-pet",
    "fest-greet",
    "fest-hunt",
    "fest-buy",
    "fest-outfit",
    "fest-start",
    "fest-run",
  ]),
  species: z.string().max(32).optional(),
  count: z.union([z.literal(1), z.literal(10)]).optional(),
  team: z.array(z.string().max(100)).length(6).optional(),
  quest: z.string().max(30).optional(),
  resource: z.string().max(30).optional(),
  id: z.string().max(100).optional(),
  avatar: z.number().int().min(0).max(7).optional(),
  region: z.string().max(15).optional(),
  npc: z.string().max(20).optional(),
  item: z.string().max(20).optional(),
  nickname: z.string().max(20).optional(),
  success: z.boolean().optional(),
  slot: z.number().int().min(1).max(2).optional(),
  x: z.number().min(-40).max(40).optional(),
  z: z.number().min(-40).max(40).optional(),
  rot: z.number().int().min(0).max(3).optional(),
  inputs: z.array(z.number().int()).max(400).optional(),
});
export function mutateRequest(t: string, body: unknown) {
  const v = mutation.parse(body);
  return operation(t, v.requestId, (p) => mutate(p, v.kind, v));
}
export function festivalBoard(t: string, query: unknown) {
  authenticate(t);
  const activity = z.enum(["race", "course", "fishing"]).parse(query);
  const day = utcDay(),
    lower = ACTIVITIES[activity].lowerIsBetter;
  const strip = (rows: ReturnType<typeof topRuns>) =>
    rows.map((r, i) => ({ rank: i + 1, profile: r.profile, name: r.name, score: r.score }));
  const today = topRuns(day, activity, lower, 10);
  return {
    day,
    featured: featuredActivity(day),
    today: strip(today),
    allTime: strip(topRuns("all", activity, lower, 10)),
    // The three best runs today, replayed as ghosts.
    ghosts: today.slice(0, 3).map((r) => ({ profile: r.profile, name: r.name, score: r.score, ...r.data })),
  };
}
export function currentBattle(t: string) {
  const p = authenticate(t);
  return pve.get(p.id) || null;
}
export function battleStart(t: string, body: unknown) {
  const p = authenticate(t);
  const v = z
    .object({
      canyon: z.boolean().optional(),
      expedition: z.boolean().optional(),
      boss: z.boolean().default(false),
      practice: z.boolean().default(false),
      stage: z.string().max(10).optional(),
      dungeon: z.string().max(10).optional(),
      tier: z.number().int().min(0).max(4).optional(),
      tower: z.number().int().min(1).max(60).optional(),
    })
    .parse(body);
  return startPve(p, v.boss, v.practice, {
    canyon: v.canyon,
    expedition: v.expedition,
    stage: v.stage,
    dungeon: v.dungeon,
    tier: v.tier,
    tower: v.tower,
  });
}
export function battleAct(t: string, body: unknown) {
  const p = authenticate(t);
  const v = z
    .object({
      action: z.number().int().min(0).max(2).optional(),
      target: z.string().max(10).optional(),
      fast: z.boolean().default(false),
      auto: z.boolean().default(false),
      sequence: z.number().int().min(0),
    })
    .parse(body);
  const b = pve.get(p.id);
  if (b?.sequence !== v.sequence)
    throw Error("Battle updated; refresh the action.");
  const actor = b?.units.find((u) => u.id === b.queue[0]);
  if (!v.auto && actor?.side === 0 && (v.action === undefined || !v.target))
    throw Error("Select an action and target.");
  return pveAction(
    p,
    v.action !== undefined && v.target
      ? { action: v.action, target: v.target }
      : undefined,
    v.fast,
  );
}
export function battleBond(t: string, body: unknown) {
  const p = authenticate(t);
  const v = z
    .object({ target: z.string().max(10), sequence: z.number().int().min(0) })
    .parse(body);
  if (pve.get(p.id)?.sequence !== v.sequence)
    throw Error("Battle updated; refresh the action.");
  return pveBond(p, v.target);
}
export const leaderboard = () =>
  allProfiles()
    .map((p) => ({
      id: p.id,
      name: p.name,
      power: ranking(p),
      ratings: p.ratings,
      ranked: p.ranked,
    }))
    .sort((a, b) => b.power - a.power);

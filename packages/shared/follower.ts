import type { Profile } from "./types";
// Kept apart from lineups.ts, which needs the battle engine: the world scene
// uses this, and must not pull the engine into the first download.
/** Who walks beside the keeper: their chosen companion while they still have
 * it, otherwise the team's first, otherwise anyone. */
export function walkingCompanion(p: Pick<Profile, "owned" | "team" | "follower">) {
  return (
    p.owned.find((o) => o.id === p.follower) ??
    p.owned.find((o) => o.id === p.team[0]) ??
    p.owned[0]
  );
}

import type { Profile } from "../../packages/shared/types";
import { day } from "../../packages/shared/economy";
/** The starting save for a new guest keeper. */
export function newProfile(id: string, name: string, avatar: number): Profile {
  return {
    id,
    name,
    avatar,
    version: 1,
    level: 1,
    xp: 0,
    gold: 200,
    diamonds: 0,
    tokens: 3,
    owned: [],
    team: [],
    pity: { as: 0, s: 0 },
    quests: {},
    claims: [],
    daily: { date: day(), wins: 0, train: 0, resources: 0, claimed: false },
    ratings: { power: 1000, tactical: 1000 },
    ranked: { power: 0, tactical: 0 },
    wins: 0,
    region: "haven",
    resources: [],
    bosses: [],
  };
}

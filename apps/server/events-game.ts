import type { Profile } from "../../packages/shared/types";
import { utcDay } from "../../packages/shared/town";
import {
  LOGIN_REWARDS,
  MONTHLY,
  MONTHLY_CHEST,
  WEEKLY,
  WEEKLY_CHEST,
  ensureEvents,
  missionDone,
  nextLoginDay,
  type EventReward,
} from "../../packages/shared/events";
import {
  GEAR_SLOTS,
  RARITIES,
  gearName,
  rewardText,
} from "../../packages/shared/adventure";
import { addGear, grantReward } from "./adventure-game";

function pay(p: Profile, r: EventReward, random: () => number) {
  const { gear, ...rest } = r;
  grantReward(p, rest);
  const parts = [rewardText(rest)];
  if (gear) {
    const g = addGear(p, GEAR_SLOTS[Math.floor(random() * 3) % 3], gear);
    parts.push(`${RARITIES[g.rarity]} ${gearName(g)}`);
  }
  return parts.filter(Boolean).join(" · ");
}
export function eventMutation(
  p: Profile,
  kind: string,
  v: any,
  now = Date.now(),
  random = Math.random,
) {
  const e = ensureEvents(p, now),
    today = utcDay(now);
  switch (kind) {
    case "login-claim": {
      if (e.login.last === today)
        throw Error("Today's login gift is already claimed. Come back tomorrow!");
      const day = nextLoginDay(e);
      e.login = { day, last: today };
      return { message: `Day ${day} gift: ${pay(p, LOGIN_REWARDS[day - 1], random)}.`, day };
    }
    case "event-claim": {
      const m = [...WEEKLY, ...MONTHLY].find((m) => m.id === v.quest);
      if (!m) throw Error("Unknown mission.");
      if (e.claimed.includes(m.id)) throw Error("Mission reward already claimed.");
      if (!missionDone(e, m)) throw Error("Finish the mission first.");
      e.claimed.push(m.id);
      return { message: `${m.title}: ${pay(p, m.reward, random)}.` };
    }
    case "event-chest": {
      const weekly = v.quest === "weekly-chest",
        list = weekly ? WEEKLY : MONTHLY;
      if (!weekly && v.quest !== "monthly-chest") throw Error("Unknown chest.");
      if (e.claimed.includes(v.quest)) throw Error("Chest already opened.");
      if (!list.every((m) => e.claimed.includes(m.id)))
        throw Error("Claim every mission in the list first.");
      e.claimed.push(v.quest);
      return {
        message: `${weekly ? "Weekly" : "Monthly"} chest: ${pay(p, weekly ? WEEKLY_CHEST : MONTHLY_CHEST, random)}.`,
      };
    }
    default:
      throw Error("Unknown request.");
  }
}

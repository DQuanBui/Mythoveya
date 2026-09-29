import type { Profile } from "../../../packages/shared/types";
import { REGIONS } from "../../../packages/shared/content";

export const WORLD_GUIDE = {
  labelRange: 8,
  labelFadeStart: 4.5,
  currencies: {
    diamonds: {
      name: "Diamonds",
      symbol: "◇",
      description:
        "Earned from battles and quests. Spend at the Bond shrine to recruit Wildbound.",
    },
    gold: {
      name: "Gold",
      symbol: "◉",
      description:
        "Earned from gathering and battles. Spend 50 Gold to train a companion and earn creature XP.",
    },
  },
  markers: {
    guide: { height: 2.25, icon: "!" },
    recruit: { height: 2.7, icon: "◇" },
    arena: { height: 5, icon: "⚔" },
    collection: { height: 4.3, icon: "✦" },
    training: { height: 1.4, icon: "⚑" },
    encounter: { height: 2.1, icon: "◇" },
    boss: { height: 3, icon: "♜" },
  } as Record<string, { height: number; icon: string }>,
};
export type Objective = {
  title: string;
  text: string;
  target?: string;
  action: string;
  button: string;
  completed: number;
};
export function currentObjective(p: Profile): Objective {
  const completed =
    Number(Boolean(p.quests.guide)) +
    Number(p.wins > 0) +
    Number(Boolean(p.quests.recruit));
  if (!p.quests.guide)
    return {
      title: "Meet your first six",
      text: "Warden Liora has companions waiting for you.",
      target: "guide",
      action: "quests",
      button: "View your quest",
      completed,
    };
  if (!p.wins)
    return {
      title: "A first bond",
      text: "Follow the diamond to the wild encounter. Win your first battle.",
      target: "encounter",
      action: "quests",
      button: "View your quest",
      completed,
    };
  if (!p.claims.includes("tutorial"))
    return {
      title: "Your first victory",
      text: "Claim your 600 Diamonds in Quests, then visit the Bond shrine.",
      action: "quests",
      button: "Claim your reward",
      completed,
    };
  if (!p.quests.recruit)
    return {
      title: "Answer the call",
      text: "Visit the Bond shrine and recruit a new companion.",
      target: "recruit",
      action: "recruit",
      button: "Visit the shrine",
      completed,
    };
  const next = REGIONS.find((r) => r.unlock > p.wins);
  if (next)
    return {
      title: "A new horizon",
      text: `Win ${next.unlock - p.wins} more battle${next.unlock - p.wins === 1 ? "" : "s"} to reach ${next.name}.`,
      target: "encounter",
      action: "map",
      button: "Explore the reaches",
      completed,
    };
  return {
    title: "The guardian awaits",
    text: "Build your team and challenge this region's guardian.",
    target: "boss",
    action: "quests",
    button: "Open your quests",
    completed,
  };
}

export type ExplorationInput = { x: number; z: number };

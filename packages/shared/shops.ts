// The Blacksmith and Apothecary: daily stock, Gold prices and per-day limits.
import type { GearSlot } from "./adventure";

export type ShopId = "smith" | "apothecary";
export type ShopOffer = {
  id: string;
  name: string;
  icon: string;
  description: string;
  gold: number;
  limit: number;
  /** Extra non-Gold ingredients (inventory item ids). */
  needs?: Record<string, number>;
  gives: { item?: string; count?: number; gear?: { slot: GearSlot; rarity: number }; buff?: Buff };
};
export type Buff = "vigor" | "swift";
export const BUFFS: Record<Buff, { name: string; text: string }> = {
  vigor: { name: "Vigor tonic", text: "+10% max HP for your companions in the next PvE battle" },
  swift: { name: "Swiftness draught", text: "+8% speed for your companions in the next PvE battle" },
};
export const SHOPS: Record<ShopId, { name: string; keeper: string; greeting: string }> = {
  smith: {
    name: "Ironbloom Smithy",
    keeper: "Brannoc the Smith",
    greeting: "Steel remembers every swing. Bring dust and gold, and I'll make it sing.",
  },
  apothecary: {
    name: "Willowroot Apothecary",
    keeper: "Mother Sage",
    greeting: "A pinch of moss, a drop of rain, and patience. Always patience.",
  },
};
const day = (now: number) => Math.floor(now / 86400000);
function pick(seed: number, n: number) {
  let s = (Math.imul(seed + 1, 2654435761) >>> 0) % 997;
  return () => (s = (s * 131 + 7) % 997) % n;
}
/** Blacksmith gear rotates daily: one weapon, armor or charm per rarity band. */
export function smithStock(now = Date.now()): ShopOffer[] {
  const r = pick(day(now), 3),
    slots: GearSlot[] = ["weapon", "armor", "charm"];
  const gear = (rarity: number, gold: number): ShopOffer => {
    const slot = slots[r()];
    return {
      id: `gear-${rarity}`,
      name: `${["Common", "Rare", "Epic"][rarity]} ${slot}`,
      icon: slot === "weapon" ? "⚔" : slot === "armor" ? "⛨" : "✶",
      description: `A freshly forged ${slot}, ready to equip from the journal.`,
      gold,
      limit: 1,
      gives: { gear: { slot, rarity } },
    };
  };
  return [
    gear(0, 180),
    gear(1, 520),
    ...(day(now) % 3 === 0 ? [gear(2, 1400)] : []),
    {
      id: "dust",
      name: "Forge dust bundle",
      icon: "⁂",
      description: "Six measures of forge dust for upgrading equipment.",
      gold: 140,
      limit: 3,
      gives: { item: "dust", count: 6 },
    },
  ];
}
export function apothecaryStock(): ShopOffer[] {
  return [
    {
      id: "elixir",
      name: "Growth elixir",
      icon: "⚱",
      description: "Gives a companion 250 creature XP.",
      gold: 180,
      limit: 3,
      gives: { item: "elixir", count: 1 },
    },
    {
      id: "tome",
      name: "Skill tome",
      icon: "❖",
      description: "Teaches a companion to strengthen a skill or ultimate.",
      gold: 420,
      limit: 1,
      gives: { item: "tome", count: 1 },
    },
    {
      id: "vigor",
      name: BUFFS.vigor.name,
      icon: "♥",
      description: BUFFS.vigor.text + ".",
      gold: 90,
      limit: 2,
      gives: { buff: "vigor" },
    },
    {
      id: "swift",
      name: BUFFS.swift.name,
      icon: "➶",
      description: BUFFS.swift.text + ".",
      gold: 90,
      limit: 2,
      gives: { buff: "swift" },
    },
    {
      id: "crystal",
      name: "Brew a Rift crystal",
      icon: "✧",
      description: "Distil two Skyfin into one Rift crystal for evolution.",
      gold: 150,
      limit: 2,
      needs: { skyfin: 2 },
      gives: { item: "crystal", count: 1 },
    },
  ];
}
export const shopStock = (shop: ShopId, now = Date.now()) =>
  shop === "smith" ? smithStock(now) : apothecaryStock();

import type { Battle, Unit } from "./types";
/** Alternating rounds are deterministic and visible before the player acts. */
export function guardianIntent(b: Battle) {
  if (!b.encounter || !b.units.some((u) => u.id === "1:0" && u.hp > 0))
    return null;
  if (b.encounter === "canyon")
    return [
      {
        title: "Glass carapace",
        text: "The sentinel takes 35% less direct damage. Gather energy before the heat surge.",
        multiplier: 0.65,
      },
      {
        title: "Heat surge",
        text: "The sentinel deals 50% more direct damage this round. Shield or heal your team; its shell cools next round.",
        multiplier: 1,
      },
      {
        title: "Cooling fractures",
        text: "The sentinel takes 75% more direct damage. Use your strongest skills before its carapace reforms.",
        multiplier: 1.75,
      },
    ][(b.round - 1) % 3];
  return b.round % 2 === 1
    ? {
        title: "Wind mantle",
        text: "Galehart takes half damage this round. Build energy and tend your team; its core opens next round.",
        multiplier: 0.5,
      }
    : {
        title: "Open core",
        text: "Galehart takes double damage this round. Spend your saved energy before the mantle returns.",
        multiplier: 2,
      };
}
export function guardianDamage(b: Battle, target: Unit) {
  return target.id === "1:0" ? (guardianIntent(b)?.multiplier ?? 1) : 1;
}

export function guardianPower(b: Battle, actor: Unit) {
  return b.encounter === "canyon" && actor.id === "1:0" && b.round % 3 === 2
    ? 1.5
    : 1;
}

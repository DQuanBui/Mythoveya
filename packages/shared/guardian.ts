import type { Battle, Unit } from "./types";
/** Alternating rounds are deterministic and visible before the player acts. */
export function guardianIntent(b: Battle) {
  if (
    b.encounter !== "windmill" ||
    !b.units.some((u) => u.id === "1:0" && u.hp > 0)
  )
    return null;
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

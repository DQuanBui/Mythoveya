const STATUS_WORDS: Record<string, string> = {
  stun: "stunned", burn: "burning", slow: "slowed", regen: "regenerating", mark: "marked", guard: "guarded",
  silence: "silenced", weaken: "weakened", haste: "hastened", boost: "boosted", reflect: "reflecting",
  warning: "charging an attack", rebirth: "ready to revive",
};
/** What a screen reader hears for a battle creature: health, shield and lasting statuses. */
export function unitLabel(name: string, hp: number, maxHp: number, shield: number, statuses: { kind: string; turns: number }[]) {
  const parts = [`${name} ${hp} of ${maxHp}`];
  if (shield > 0) parts.push(`shield ${shield}`);
  for (const s of statuses) parts.push(`${STATUS_WORDS[s.kind] || s.kind} for ${s.turns} ${s.turns === 1 ? "round" : "rounds"}`);
  return parts.join(", ");
}

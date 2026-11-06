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
/** One line on how a finished battle went, from the viewer's side. */
export function battleSummary(units: { side: number; hp: number }[], side: number, round: number) {
  const mine = units.filter((u) => u.side === side),
    foes = units.filter((u) => u.side !== side);
  return [
    `Settled in round ${round}`,
    `${mine.filter((u) => u.hp > 0).length} of ${mine.length} companions still standing`,
    `${foes.filter((u) => u.hp === 0).length} of ${foes.length} foes calmed`,
  ].join(" · ");
}
/** What a screen reader hears as a battle moves on: the latest event and, on
 * the player's turn, who acts next. */
export function battleAnnouncement(lastLog: string | undefined, myTurnName: string | null) {
  return [lastLog, myTurnName && `Your turn: ${myTurnName}.`].filter(Boolean).join(" ");
}

/** Damage multiplier for an attack of element `a` on a creature of element `b`:
 * Light and Shadow beat each other; the other five beat the next in the cycle. */
export function elementMultiplier(a: string, b: string) {
  if ((a === "Light" && b === "Shadow") || (a === "Shadow" && b === "Light"))
    return 1.2;
  const cycle = ["Flame", "Grove", "Stone", "Storm", "Tide"];
  const x = cycle.indexOf(a),
    y = cycle.indexOf(b);
  if (x < 0 || y < 0) return 1;
  return (x + 1) % 5 === y ? 1.2 : (y + 1) % 5 === x ? 0.85 : 1;
}
/** How an attack of element `a` fares against element `b`, for the battle UI. */
export function matchupWord(a: string, b: string) {
  const m = elementMultiplier(a, b);
  return m > 1 ? "strong" : m < 1 ? "resisted" : "";
}
export const ELEMENT_NAMES = ["Flame", "Grove", "Stone", "Storm", "Tide", "Frost", "Light", "Shadow"];
/** Which elements a team strikes strongly, and which of them it has no answer to. */
export function teamCoverage(team: string[]) {
  const strong = ELEMENT_NAMES.filter((foe) => team.some((own) => elementMultiplier(own, foe) > 1));
  return { strong, gaps: ELEMENT_NAMES.filter((foe) => !strong.includes(foe)) };
}

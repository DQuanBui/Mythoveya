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

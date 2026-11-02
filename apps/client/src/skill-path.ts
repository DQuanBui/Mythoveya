import * as T from "three";

const side = new T.Vector3(),
  up = new T.Vector3(0, 1, 0);
/** Where a skill's effect is `k` (0..1) of the way from caster to target.
 * Each element travels its own way: flame and stone are lobbed, tide rides
 * a wave, storm zigzags, grove corkscrews, shadow dips low and weaves, frost and light
 * fly straight. */
export function skillPath(element: string, from: T.Vector3, to: T.Vector3, k: number, out = new T.Vector3()) {
  out.lerpVectors(from, to, k);
  const arc = Math.sin(k * Math.PI);
  side.subVectors(to, from).cross(up).normalize();
  switch (element) {
    case "Flame":
      out.y += arc * 1.1;
      break;
    case "Stone":
      out.y += arc * 1.7;
      break;
    case "Tide":
      out.y += arc * 0.5;
      out.addScaledVector(side, Math.sin(k * Math.PI * 3) * 0.45 * arc);
      break;
    case "Storm": {
      // A sawtooth across the path, three sharp turns.
      const saw = Math.abs(((k * 3.5) % 1) * 2 - 1) * 2 - 1;
      out.addScaledVector(side, saw * 0.5 * arc);
      out.y += arc * 0.3;
      break;
    }
    case "Grove":
      out.addScaledVector(side, Math.cos(k * Math.PI * 4) * 0.4 * arc);
      out.y += Math.sin(k * Math.PI * 4) * 0.4 * arc + arc * 0.3;
      break;
    case "Shadow":
      out.y -= arc * 0.45;
      out.addScaledVector(side, Math.sin(k * Math.PI * 2) * 0.3 * arc);
      break;
  }
  return out;
}

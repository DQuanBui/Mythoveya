import * as T from "three";

// Shared lit materials: DayNight raises their glow after sunset.
export const lampGlow = new T.MeshStandardMaterial({
  color: "#f8e4ae",
  emissive: "#f3c06a",
  emissiveIntensity: 0.25,
  flatShading: true,
});
export const villageGlow = new T.MeshStandardMaterial({
  vertexColors: true,
  emissive: "#f0b860",
  emissiveIntensity: 0.3,
  flatShading: true,
});
export function setNightGlow(glow: number) {
  villageGlow.emissiveIntensity = 0.3 + glow * 1.5;
  lampGlow.emissiveIntensity = 0.25 + glow * 2.4;
}
// The keeper's live position, used to keep sun shadows around the player.
export const worldFocus = new T.Vector3(0, 0, 5);

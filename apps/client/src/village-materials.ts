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
// Where the following companion naps (if it does), for visitors like butterflies.
export const companionRest = { napping: false, at: new T.Vector3(), top: 1 };
// The companion celebrates a find (a cache, a lantern, a gift, gathering) until `until` (ms).
export const companionJoy = { until: 0 };
// How dark it is (0 day .. 1 night), for things like the keeper's lantern.
export const nightState = { glow: 0 };
export function setNightGlow(glow: number) {
  nightState.glow = glow;
  villageGlow.emissiveIntensity = 0.3 + glow * 1.5;
  lampGlow.emissiveIntensity = 0.25 + glow * 2.4;
}
// The keeper's live position, used to keep sun shadows around the player.
export const worldFocus = new T.Vector3(0, 0, 5);
// The keeper's facing (avatar yaw), shown by the minimap arrow.
export const worldHeading = { yaw: Math.PI };
// The keeper's current emote (keys 1-4 or the HUD), until `until` (ms) or until they move.
export const keeperEmote: { name: "" | "wave" | "cheer" | "dance" | "sit"; until: number } = { name: "", until: 0 };
export const EMOTES = [
  { id: "wave", label: "Wave", icon: "👋", ms: 2500 },
  { id: "cheer", label: "Cheer", icon: "🙌", ms: 3000 },
  { id: "dance", label: "Dance", icon: "💃", ms: Infinity },
  { id: "sit", label: "Sit", icon: "🪑", ms: Infinity },
] as const;
export function playEmote(id: (typeof EMOTES)[number]["id"]) {
  const e = EMOTES.find((x) => x.id === id)!;
  keeperEmote.name = keeperEmote.name === id && e.ms === Infinity ? "" : id;
  keeperEmote.until = Date.now() + e.ms;
}

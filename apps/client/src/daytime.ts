import { settings } from "./audio";

// One island day lasts 18 real minutes. Daylight (06:00-18:00) takes 65% of it.
export const DAY_CYCLE_MS = 18 * 60 * 1000;
const DAYLIGHT_SHARE = 0.65;

export function islandHour(now = Date.now()) {
  if (!settings.daynight) return 13;
  // Development builds can pin the hour for screenshots and tests.
  const pinned = (globalThis as { __islandHour?: number }).__islandHour;
  if (import.meta.env.DEV && typeof pinned === "number") return pinned;
  const p = (now % DAY_CYCLE_MS) / DAY_CYCLE_MS;
  return p < DAYLIGHT_SHARE
    ? 6 + (p / DAYLIGHT_SHARE) * 12
    : (18 + ((p - DAYLIGHT_SHARE) / (1 - DAYLIGHT_SHARE)) * 12) % 24;
}
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Sun elevation, daylight (0-1), dusk/dawn warmth (0-1) and lamp glow (0-1). */
export function daylight(hour: number) {
  const angle = ((hour - 6) / 12) * Math.PI,
    elevation = Math.sin(angle);
  return {
    angle,
    elevation,
    day: smooth(-0.1, 0.32, elevation),
    twilight: Math.max(0, 1 - Math.abs(elevation) / 0.3),
    glow: 1 - smooth(0.02, 0.42, elevation),
  };
}
export function timeLabel(hour: number) {
  const h = Math.floor(hour),
    m = Math.floor((hour - h) * 60);
  const phase =
    hour >= 5 && hour < 7.5
      ? "Dawn"
      : hour < 12 && hour >= 7.5
        ? "Morning"
        : hour >= 12 && hour < 17
          ? "Afternoon"
          : hour >= 17 && hour < 19.5
            ? "Dusk"
            : "Night";
  return {
    phase,
    icon: phase === "Night" ? "✧" : phase === "Dusk" || phase === "Dawn" ? "◐" : "☀",
    clock: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

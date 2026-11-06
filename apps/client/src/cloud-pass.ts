const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Sunlight left by passing clouds at time `t` in seconds: 1 under open sky,
 * easing down to 0.5 for a while every minute or so. */
export function cloudShade(t: number) {
  const drift = Math.sin(t * 0.13) + Math.sin(t * 0.31 + 1.7) * 0.6;
  return 1 - smooth(0.55, 1.45, drift) * 0.5;
}

export const DAY_CYCLE_MS = 18 * 60 * 1000;
/** Authoritative island time; visual settings never change discovery eligibility. */
export function worldHour(now = Date.now()) {
  const p = ((now % DAY_CYCLE_MS) + DAY_CYCLE_MS) % DAY_CYCLE_MS / DAY_CYCLE_MS;
  return p < 0.65 ? 6 + p / 0.65 * 12 : (18 + (p - 0.65) / 0.35 * 12) % 24;
}

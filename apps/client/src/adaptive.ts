// When a device can't keep up, purely decorative effects (drifting motes,
// water glints, puddles, puffs, islet drift) step aside. Gameplay feedback
// stays. Node-safe so it can be tested.
export const perf = { lite: false };

const SLOW = 1000 / 30,
  SMOOTH = 1000 / 50;
/** Watches frame times: switches `lite` on after 6 s below ~30 fps, and back
 * off after 20 s above ~50 fps. Returns the current state. */
export function frameMonitor() {
  let average = 1000 / 60,
    slowFor = 0,
    fastFor = 0;
  return {
    add(ms: number, state = perf) {
      // Ignore stalls from tab switches and loading; they say nothing about rendering.
      if (ms > 500) return state.lite;
      average += (ms - average) * 0.05;
      slowFor = average > SLOW ? slowFor + ms : 0;
      fastFor = average < SMOOTH ? fastFor + ms : 0;
      if (!state.lite && slowFor > 6000) {
        state.lite = true;
        fastFor = 0;
        if (typeof console !== "undefined") console.info("Mythoveya: frame rate is low, so decorative effects are paused.");
      } else if (state.lite && fastFor > 20000) {
        state.lite = false;
        slowFor = 0;
      }
      return state.lite;
    },
  };
}

/** Applies the player's choice: "Full" and "Minimal" fix the effects; "Auto"
 * leaves them to the monitor. Returns the current state. */
export function applyEffects(choice: string, monitor: ReturnType<typeof frameMonitor>, ms: number, state = perf) {
  if (choice === "Full") return (state.lite = false);
  if (choice === "Minimal") return (state.lite = true);
  return monitor.add(ms, state);
}

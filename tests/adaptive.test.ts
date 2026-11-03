import { describe, expect, it } from "vitest";
import { frameMonitor } from "../apps/client/src/adaptive";

describe("adaptive effects", () => {
  const run = (m: ReturnType<typeof frameMonitor>, state: { lite: boolean }, ms: number, seconds: number) => {
    for (let t = 0; t < seconds * 1000; t += ms) m.add(ms, state);
  };
  it("pauses decorative effects only after a sustained low frame rate", () => {
    const m = frameMonitor(),
      state = { lite: false };
    run(m, state, 16.7, 30);
    expect(state.lite).toBe(false);
    run(m, state, 45, 3);
    expect(state.lite).toBe(false);
    run(m, state, 45, 10);
    expect(state.lite).toBe(true);
  });
  it("brings them back after a long smooth stretch, and ignores one-off stalls", () => {
    const m = frameMonitor(),
      state = { lite: false };
    for (let i = 0; i < 20; i++) m.add(2000, state);
    expect(state.lite).toBe(false);
    run(m, state, 45, 12);
    expect(state.lite).toBe(true);
    run(m, state, 16.7, 10);
    expect(state.lite).toBe(true);
    run(m, state, 16.7, 25);
    expect(state.lite).toBe(false);
  });
});

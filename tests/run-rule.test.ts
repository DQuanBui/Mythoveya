import { describe, expect, it } from "vitest";
import { runs } from "../apps/client/src/run-rule";

describe("run by default", () => {
  it("is off by default: Shift runs, as before", () => {
    expect(runs(false, false, false)).toBe(false);
    expect(runs(false, true, false)).toBe(true);
  });
  it("turned on, runs unless Shift is held", () => {
    expect(runs(true, false, false)).toBe(true);
    expect(runs(true, true, false)).toBe(false);
  });
  it("lets a trigger or a fully tilted stick run either way", () => {
    expect(runs(false, false, true)).toBe(true);
    expect(runs(true, true, true)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { mistAt } from "../apps/client/src/mist";

describe("morning mist", () => {
  it("gathers after dawn, peaks around seven and burns off by half past nine", () => {
    expect(mistAt(4)).toBe(0);
    expect(mistAt(6.25)).toBeCloseTo(0.5);
    expect(mistAt(7)).toBe(1);
    expect(mistAt(8.25)).toBeCloseTo(0.5);
    expect(mistAt(12)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { cloudShade } from "../apps/client/src/cloud-pass";

describe("cloudShade", () => {
  const samples = Array.from({ length: 36000 }, (_, i) => cloudShade(i / 10));
  it("keeps to its range, and both open sky and cloud really happen", () => {
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...samples)).toBe(1);
    expect(Math.min(...samples)).toBeLessThan(0.55);
  });
  it("leaves the sky open most of the time", () => {
    expect(samples.filter((s) => s === 1).length / samples.length).toBeGreaterThan(0.6);
  });
  it("changes too slowly to read as a flicker", () => {
    for (let i = 1; i < samples.length; i++) expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(0.03);
  });
  it("comes round again and again", () => {
    let dips = 0;
    for (let i = 1; i < samples.length; i++) if (samples[i] < 1 && samples[i - 1] === 1) dips++;
    expect(dips).toBeGreaterThan(30);
  });
});

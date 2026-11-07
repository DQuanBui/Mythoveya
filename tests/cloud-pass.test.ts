import { describe, expect, it } from "vitest";
import { cloudAmount, cloudField } from "../apps/client/src/cloud-pass";

describe("cloudField", () => {
  const size = 64,
    field = cloudField(size);
  it("spreads across light and shade, so both open sky and cloud appear", () => {
    const covered = field.filter((v) => v / 255 > 0.58).length / field.length;
    expect(covered).toBeGreaterThan(0.1);
    expect(covered).toBeLessThan(0.5);
  });
  it("tiles without a seam", () => {
    for (let i = 0; i < size; i++) {
      expect(Math.abs(field[i] - field[(size - 1) * size + i])).toBeLessThan(30);
      expect(Math.abs(field[i * size] - field[i * size + size - 1])).toBeLessThan(30);
    }
  });
  it("is smooth enough to read as cloud, not grain", () => {
    for (let i = 1; i < size; i++) expect(Math.abs(field[size * 10 + i] - field[size * 10 + i - 1])).toBeLessThan(30);
  });
});
describe("cloudAmount", () => {
  it("shades by day under open sky", () => {
    expect(cloudAmount(1, 0, true)).toBe(0.7);
  });
  it("is off at night, in rain and when disabled", () => {
    expect(cloudAmount(0, 0, true)).toBe(0);
    expect(cloudAmount(1, 0.7, true)).toBe(0);
    expect(cloudAmount(1, 0, false)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { PAD, newlyPressed, padCommand, padMode, sprintHeld, stick } from "../apps/client/src/gamepad-map";

describe("controller map", () => {
  it("puts open panels and results before the battle or world behind them", () => {
    expect(padMode({ dialog: true, result: false, battle: false, world: true })).toBe("menu");
    expect(padMode({ dialog: false, result: true, battle: true, world: false })).toBe("menu");
    expect(padMode({ dialog: false, result: false, battle: true, world: false })).toBe("battle");
    expect(padMode({ dialog: false, result: false, battle: false, world: true })).toBe("world");
    expect(padMode({ dialog: false, result: false, battle: false, world: false })).toBe("menu");
  });
  it("gives A the job of using, confirming or clicking", () => {
    expect(padCommand("world", PAD.A)).toEqual({ key: "KeyE" });
    expect(padCommand("battle", PAD.A)).toEqual({ key: "Enter" });
    expect(padCommand("menu", PAD.A)).toEqual({ click: true });
  });
  it("lets B back out of menus and Start pause the world", () => {
    expect(padCommand("menu", PAD.B)).toEqual({ key: "Escape" });
    expect(padCommand("world", PAD.START)).toEqual({ key: "Escape" });
  });
  it("reaches all three abilities and the target in battle", () => {
    expect([PAD.X, PAD.Y, PAD.RB].map((b) => padCommand("battle", b))).toEqual([{ key: "Digit1" }, { key: "Digit2" }, { key: "Digit3" }]);
    expect(padCommand("battle", PAD.RIGHT)).toEqual({ key: "ArrowRight" });
  });
  it("walks focus through menus in both directions", () => {
    expect(padCommand("menu", PAD.DOWN)).toEqual({ focus: 1 });
    expect(padCommand("menu", PAD.UP)).toEqual({ focus: -1 });
  });
});
describe("stick", () => {
  it("ignores resting wobble", () => {
    expect(stick(0.1, -0.1)).toEqual([0, 0]);
  });
  it("still reaches full tilt, without going past it", () => {
    expect(stick(1, 0)[0]).toBeCloseTo(1);
    expect(Math.hypot(...stick(1, 1))).toBeCloseTo(1);
  });
  it("eases in just past the dead zone and keeps its direction", () => {
    const [x, z] = stick(0, -0.25);
    expect(x).toBe(0);
    expect(z).toBeLessThan(0);
    expect(z).toBeGreaterThan(-0.15);
  });
});
describe("buttons", () => {
  it("reports a press once, not while it is held", () => {
    expect(newlyPressed([false, false], [true, false])).toEqual([0]);
    expect(newlyPressed([true, false], [true, false])).toEqual([]);
    expect(newlyPressed([], [false, true])).toEqual([1]);
  });
  it("sprints on a trigger, the right bumper or a stick press", () => {
    const held = (b: number) => Array.from({ length: 16 }, (_, i) => i === b);
    for (const b of [PAD.RT, PAD.LT, PAD.RB, PAD.L3]) expect(sprintHeld(held(b))).toBe(true);
    expect(sprintHeld(held(PAD.A))).toBe(false);
  });
});

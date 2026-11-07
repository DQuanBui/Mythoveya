// What a controller's buttons mean where. Numbers follow the browser's "standard"
// gamepad layout (Xbox names; a PlayStation Cross is A, Circle is B, and so on).
export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
export type PadMode = "world" | "battle" | "menu";
export type PadCommand = { key: string } | { focus: 1 | -1 } | { click: true };

const COMMANDS: Record<PadMode, Record<number, PadCommand>> = {
  // Everything but menus speaks as the keyboard does, so there is one code path.
  world: {
    [PAD.A]: { key: "KeyE" },
    [PAD.Y]: { key: "KeyR" },
    [PAD.START]: { key: "Escape" },
    [PAD.UP]: { key: "Digit1" },
    [PAD.RIGHT]: { key: "Digit2" },
    [PAD.DOWN]: { key: "Digit3" },
    [PAD.LEFT]: { key: "Digit4" },
  },
  battle: {
    [PAD.A]: { key: "Enter" },
    [PAD.X]: { key: "Digit1" },
    [PAD.Y]: { key: "Digit2" },
    [PAD.RB]: { key: "Digit3" },
    [PAD.LEFT]: { key: "ArrowLeft" },
    [PAD.RIGHT]: { key: "ArrowRight" },
    [PAD.LB]: { key: "KeyA" },
    [PAD.BACK]: { key: "KeyF" },
  },
  menu: {
    [PAD.A]: { click: true },
    [PAD.B]: { key: "Escape" },
    [PAD.START]: { key: "Escape" },
    [PAD.UP]: { focus: -1 },
    [PAD.LEFT]: { focus: -1 },
    [PAD.DOWN]: { focus: 1 },
    [PAD.RIGHT]: { focus: 1 },
  },
};
export const padCommand = (mode: PadMode, button: number): PadCommand | undefined => COMMANDS[mode][button];

export function padMode(page: { dialog: boolean; result: boolean; battle: boolean; world: boolean }): PadMode {
  if (page.dialog || page.result) return "menu";
  if (page.battle) return "battle";
  return page.world ? "world" : "menu";
}
/** A stick's position with its resting wobble removed, still reaching full tilt. */
export function stick(x: number, y: number, dead = 0.18): [number, number] {
  const length = Math.hypot(x, y);
  if (length <= dead) return [0, 0];
  const scale = Math.min(1, (length - dead) / (1 - dead)) / length;
  return [x * scale, y * scale];
}
/** Buttons that went down since the last look. */
export const newlyPressed = (before: boolean[], now: boolean[]) =>
  now.flatMap((down, i) => (down && !before[i] ? [i] : []));
/** Any of these held while walking means a sprint. */
export const sprintHeld = (now: boolean[]) => !!(now[PAD.RT] || now[PAD.LT] || now[PAD.RB] || now[PAD.L3]);

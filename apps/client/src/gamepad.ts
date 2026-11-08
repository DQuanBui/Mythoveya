import { focusables } from "./dialog-focus";
import { newlyPressed, padCommand, padMode, sprintHeld, stick } from "./gamepad-map";

/** The controller's live movement, read by the explorer each frame. */
export const padInput = { x: 0, z: 0, sprint: false, turn: 0 };
const clear = () => Object.assign(padInput, { x: 0, z: 0, sprint: false, turn: 0 });

function press(code: string) {
  for (const type of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}
function moveFocus(root: ParentNode, step: 1 | -1) {
  const list = focusables(root);
  if (!list.length) return;
  const at = list.indexOf(document.activeElement as HTMLElement),
    next = at < 0 ? (step > 0 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
  list[next].focus({ focusVisible: true } as FocusOptions);
}
function act(button: number) {
  const dialog = document.querySelector("[role=dialog]"),
    result = document.querySelector(".result-summary"),
    mode = padMode({
      dialog: !!dialog,
      result: !!result,
      battle: !!document.querySelector(".battle-screen"),
      world: !!document.querySelector(".world-hud"),
    }),
    command = padCommand(mode, button);
  if (!command) return;
  if ("key" in command) press(command.key);
  else if ("focus" in command) moveFocus(dialog ?? result?.parentElement ?? document.body, command.focus);
  else if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) document.activeElement.click();
}
let before: boolean[] = [],
  running = false;
function poll() {
  const pad = [...navigator.getGamepads()].find((p) => p?.connected);
  if (!pad) {
    running = false;
    before = [];
    clear();
    return;
  }
  if (document.hasFocus()) {
    const now = pad.buttons.map((b) => b.pressed),
      [x, z] = stick(pad.axes[0] || 0, pad.axes[1] || 0),
      [turn] = stick(pad.axes[2] || 0, pad.axes[3] || 0);
    Object.assign(padInput, { x, z, turn, sprint: sprintHeld(now) });
    newlyPressed(before, now).forEach(act);
    before = now;
  } else clear();
  requestAnimationFrame(poll);
}
/** Controllers show up only after a button press; polling then runs while one is attached. */
export function startGamepad() {
  window.addEventListener("gamepadconnected", () => {
    if (!running) {
      running = true;
      requestAnimationFrame(poll);
    }
  });
}
/** A short buzz on a controller that can, scaled 0-1. Silent without one. */
export function rumble(strength: number, ms: number) {
  const pad = [...navigator.getGamepads()].find((p) => p?.connected) as (Gamepad & { vibrationActuator?: { playEffect: (type: string, params: object) => Promise<unknown> } }) | undefined;
  pad?.vibrationActuator?.playEffect("dual-rumble", { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength * 1.4) }).catch(() => {});
}

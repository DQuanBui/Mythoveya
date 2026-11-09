// Keys a player can choose. Each action keeps its default key; a chosen key is
// translated into that default before the game sees it, so every existing
// control works unchanged.
export const KEY_ACTIONS = [
  { id: "up", label: "Move forward", code: "KeyW" },
  { id: "left", label: "Move left", code: "KeyA" },
  { id: "down", label: "Move back", code: "KeyS" },
  { id: "right", label: "Move right", code: "KeyD" },
  { id: "sprint", label: "Sprint", code: "ShiftLeft" },
  { id: "use", label: "Use what is in reach", code: "KeyE" },
  { id: "camera", label: "Reset the camera", code: "KeyR" },
  { id: "quests", label: "Quests", code: "KeyQ" },
  { id: "journal", label: "Journal", code: "KeyJ" },
  { id: "team", label: "Team", code: "KeyT" },
  { id: "map", label: "Map", code: "KeyM" },
  { id: "photo", label: "Photo mode", code: "KeyP" },
] as const;
export type Bindings = Partial<Record<(typeof KEY_ACTIONS)[number]["id"], string>>;
/** Keys that always keep their own meaning. */
const RESERVED = new Set(["Escape", "Tab", "Enter", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/** Chosen key -> the default key it stands for. */
export function translation(bindings: Bindings) {
  const map = new Map<string, string>();
  for (const a of KEY_ACTIONS) {
    const chosen = bindings[a.id];
    if (chosen && chosen !== a.code) map.set(chosen, a.code);
  }
  return map;
}
/** Binds `code` to an action, taking it from any other action that had it.
 * Returns the bindings unchanged for keys that can't be bound. */
export function bind(bindings: Bindings, action: (typeof KEY_ACTIONS)[number]["id"], code: string): Bindings {
  if (RESERVED.has(code) || /^Digit[1-4]$/.test(code)) return bindings;
  const next: Bindings = {};
  for (const a of KEY_ACTIONS) {
    const current = bindings[a.id];
    if (a.id !== action && current && current !== code) next[a.id] = current;
  }
  next[action] = code;
  return next;
}
/** The key an action answers to now. */
export const keyFor = (bindings: Bindings, action: (typeof KEY_ACTIONS)[number]["id"]) =>
  bindings[action] ?? KEY_ACTIONS.find((a) => a.id === action)!.code;
/** "KeyW" -> "W", "ShiftLeft" -> "Left Shift", for showing a key. */
export function keyName(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  const side = code.match(/^(Shift|Control|Alt|Meta)(Left|Right)$/);
  if (side) return `${side[2]} ${side[1] === "Control" ? "Ctrl" : side[1]}`;
  return code;
}

const KEY = "mythoveya-keys";
export function loadBindings(): Bindings {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveBindings(b: Bindings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    // Without storage the keys last until the page is closed.
  }
  current = translation(b);
}
let current = new Map<string, string>(),
  paused = false;
/** Stops translating while the settings wait for a new key. */
export const pauseKeybinds = (on: boolean) => void (paused = on);
/** Starts translating chosen keys. Typing in a field is left alone. */
export function startKeybinds() {
  current = translation(loadBindings());
  for (const type of ["keydown", "keyup"] as const)
    window.addEventListener(
      type,
      (e) => {
        const to = current.get(e.code);
        if (!to || !e.isTrusted || paused) return;
        if (e.target instanceof HTMLElement && e.target.matches("input,textarea,select")) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent(type, { code: to, key: to, repeat: e.repeat, shiftKey: e.shiftKey }));
      },
      true,
    );
}

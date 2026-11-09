import { describe, expect, it } from "vitest";
import { bind, keyFor, keyName, translation } from "../apps/client/src/keybinds";

describe("chosen keys", () => {
  it("translate a chosen key into the action's default", () => {
    expect([...translation({ use: "KeyF", up: "KeyI" })]).toEqual([
      ["KeyI", "KeyW"],
      ["KeyF", "KeyE"],
    ]);
  });
  it("leave defaults out of the translation", () => {
    expect(translation({ up: "KeyW" }).size).toBe(0);
  });
  it("move a key from one action to another rather than sharing it", () => {
    const b = bind(bind({}, "use", "KeyF"), "journal", "KeyF");
    expect(b.use).toBeUndefined();
    expect(keyFor(b, "use")).toBe("KeyE");
    expect(keyFor(b, "journal")).toBe("KeyF");
  });
  it("refuse keys with fixed meanings: Escape, Tab, Enter, Space, arrows and the emote numbers", () => {
    for (const code of ["Escape", "Tab", "Enter", "Space", "ArrowUp", "Digit1"]) expect(bind({}, "use", code)).toEqual({});
  });
  it("name keys the way a keyboard shows them", () => {
    expect(keyName("KeyW")).toBe("W");
    expect(keyName("ShiftLeft")).toBe("Left Shift");
    expect(keyName("ControlRight")).toBe("Right Ctrl");
    expect(keyName("Digit7")).toBe("7");
  });
});

import { describe, expect, it } from "vitest";
import { WHATS_NEW, whatsNewUnread } from "../apps/client/src/whats-new";

describe("what's new", () => {
  it("lights up until this list has been read", () => {
    expect(WHATS_NEW.items.length).toBeGreaterThan(0);
    expect(whatsNewUnread(() => null)).toBe(true);
    expect(whatsNewUnread(() => "an older list")).toBe(true);
    expect(whatsNewUnread(() => WHATS_NEW.id)).toBe(false);
  });
  it("stays quiet when the browser can't remember", () => {
    expect(
      whatsNewUnread(() => {
        throw Error("storage blocked");
      }),
    ).toBe(false);
  });
});

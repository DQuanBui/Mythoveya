import { describe, expect, it } from "vitest";
import { formatReport } from "../apps/client/src/diagnostics";

const info = {
  build: "abc1234",
  online: true,
  agent: "TestBrowser/1",
  screen: "390×844 at 3x, touch",
  graphics: "Test GPU",
  where: "world · haven",
  settings: { quality: "Medium", master: 0.6000001, reduced: false },
  errors: [] as string[],
};
describe("problem reports", () => {
  it("lay out the device, place and settings, ending with a question for the player", () => {
    const text = formatReport(info);
    expect(text).toContain("Build: abc1234 (online)");
    expect(text).toContain("Screen: 390×844 at 3x, touch");
    expect(text).toContain("Where: world · haven");
    expect(text).toContain("Settings: quality=Medium, master=0.6, reduced=false");
    expect(text).toContain("Recent errors: none");
    expect(text.trim().endsWith("What happened, and what did you expect?")).toBe(true);
  });
  it("list recent errors one per line", () => {
    const text = formatReport({ ...info, online: false, errors: ["12:00:01 boom", "12:00:02 bang"] });
    expect(text).toContain("(local server)");
    expect(text).toMatch(/Recent errors: \n  12:00:01 boom\n  12:00:02 bang/);
  });
});

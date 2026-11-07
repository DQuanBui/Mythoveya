import { describe, expect, it } from "vitest";
import { backupDue } from "../apps/client/src/backup-reminder";

const DAY = 86400000,
  now = 1000 * DAY;
describe("backupDue", () => {
  it("waits until there is something to lose", () => {
    expect(backupDue({ now, backedUp: 0, reminded: 0, wins: 4 })).toBe(false);
    expect(backupDue({ now, backedUp: 0, reminded: 0, wins: 5 })).toBe(true);
  });
  it("stays quiet after a recent backup", () => {
    expect(backupDue({ now, backedUp: now - 13 * DAY, reminded: 0, wins: 9 })).toBe(false);
    expect(backupDue({ now, backedUp: now - 15 * DAY, reminded: 0, wins: 9 })).toBe(true);
  });
  it("does not nag: one reminder a week at most", () => {
    expect(backupDue({ now, backedUp: 0, reminded: now - 6 * DAY, wins: 9 })).toBe(false);
    expect(backupDue({ now, backedUp: 0, reminded: now - 8 * DAY, wins: 9 })).toBe(true);
  });
});

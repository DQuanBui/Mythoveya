const DAY = 86400000;
/** Whether to remind an online player that their save lives only in this browser:
 * once they have something to lose, not too often, and not just after a backup. */
export function backupDue(state: { now: number; backedUp: number; reminded: number; wins: number }) {
  return state.wins >= 5 && state.now - state.backedUp > 14 * DAY && state.now - state.reminded > 7 * DAY;
}

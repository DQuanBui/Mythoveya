// Shown on the title screen. Change the id whenever the list changes, so the
// marker lights up again for returning players.
export const WHATS_NEW = {
  id: "2026-11-07",
  items: [
    "Cloud shadows now drift across the land on clear days.",
    "Play with a game controller: walking, the camera, menus and battles.",
    "Install the online game for its own icon and window, and play it with no connection.",
    "The Team panel suggests a strong six, brings back recent lineups and sorts your companions.",
    "Battles estimate each ability's damage, explain how elements work and name the star of the fight.",
    "New shortcuts: Q Quests, J Journal, T Team, M Map.",
  ],
};
const KEY = "mythoveya-whats-new";
/** Whether this list is news to the player. A browser that can't remember stays quiet. */
export function whatsNewUnread(read: () => string | null = () => localStorage.getItem(KEY)) {
  try {
    return read() !== WHATS_NEW.id;
  } catch {
    return false;
  }
}
export function markWhatsNewRead() {
  try {
    localStorage.setItem(KEY, WHATS_NEW.id);
  } catch {
    // The marker simply stays lit.
  }
}

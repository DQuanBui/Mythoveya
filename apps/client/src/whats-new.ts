// Shown on the title screen. Change the id whenever the list changes, so the
// marker lights up again for returning players.
export const WHATS_NEW = {
  id: "2026-11-09",
  items: [
    "The wild encounter spot shows who is out: a night creature after dark, a rain lover in the rain.",
    "The Journal remembers every creature you have met, and shows the ones you haven't as silhouettes.",
    "New Journal filter: creatures seen but not yet befriended.",
    "Night, dawn, rain and mist creatures were too strong for growing keepers; they now come in at a fairer level.",
    "The game's first download is about 11% smaller, so it opens sooner.",
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

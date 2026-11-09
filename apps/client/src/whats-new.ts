// Shown on the title screen. Change the id whenever the list changes, so the
// marker lights up again for returning players.
export const WHATS_NEW = {
  id: "2026-11-10",
  items: [
    "Choose who walks beside you: open a companion in the Journal and press Walk with me.",
    "Choose your own keys under Sound & settings → Keyboard keys.",
    "Your first wild battles are gentler while you learn, easing into the usual challenge by your twentieth win.",
    "In battle, creatures you have never met are tagged NEW, and the result names your first meetings.",
    "The Journal forecasts when the next night, dawn, rain or mist creatures come out.",
    "Meet 40 species to earn the Field Naturalist title.",
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

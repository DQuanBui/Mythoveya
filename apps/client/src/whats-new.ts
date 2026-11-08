// Shown on the title screen. Change the id whenever the list changes, so the
// marker lights up again for returning players.
export const WHATS_NEW = {
  id: "2026-11-08",
  items: [
    "Night, dawn, rain and mist bring out their own wild creatures in every region. Look for the chip under the weather.",
    "The Journal says where and when to meet each creature, and can show who is out right now.",
    "Your companion keeps a little room beside you and finds things to do while you wait: sniffing about, digging, a lap around you.",
    "Befriend five creatures of the night, dawn, rain or mist to earn the Night Watcher title.",
    "Iskavelle's Absolute Stillness now works on foes, as it always should have.",
    "New settings: Run by default, and Report a problem to copy details for a bug message.",
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

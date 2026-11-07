import { useEffect, useState } from "react";
// Browsers offer installing a web game once, through an event that must be kept
// until the player asks. Listening starts as this module loads, so it isn't missed.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let waiting: InstallEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  waiting = e as InstallEvent;
  changed();
});
addEventListener("appinstalled", () => {
  waiting = null;
  changed();
});
/** Whether the browser is offering an install right now, and how to accept. */
export function useInstallPrompt() {
  const [can, setCan] = useState(!!waiting);
  useEffect(() => {
    const update = () => setCan(!!waiting);
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  return can
    ? async () => {
        const event = waiting;
        waiting = null;
        changed();
        await event?.prompt();
        // An installed game should also keep its save if the browser runs short of space.
        if ((await event?.userChoice)?.outcome === "accepted") await navigator.storage?.persist?.();
      }
    : null;
}

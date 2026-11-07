import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
/** What the keyboard (or a controller) can reach inside `root`, in page order. */
export const focusables = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => e.getClientRects().length > 0);

/** Behaves as a modal should while `open` is set: focus moves in, Tab stays
 * inside, and focus returns to where it was on closing. Names the dialog after
 * its heading, which may arrive later from a lazy panel. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: string) {
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const previous = document.activeElement;
    el.focus({ preventScroll: true });
    const name = () => {
      const heading = el.querySelector("h1,h2");
      if (!heading) return false;
      heading.id ||= `dialog-title-${open}`;
      el.setAttribute("aria-labelledby", heading.id);
      return true;
    };
    const watcher = new MutationObserver(() => name() && watcher.disconnect());
    if (!name()) watcher.observe(el, { childList: true, subtree: true });
    const tab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables(el);
      if (!list.length) return;
      const at = list.indexOf(document.activeElement as HTMLElement),
        next = e.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : at === list.length - 1 ? 0 : at + 1;
      if (at < 0 || next === 0 || next === list.length - 1) {
        e.preventDefault();
        list[next].focus();
      }
    };
    el.addEventListener("keydown", tab);
    return () => {
      watcher.disconnect();
      el.removeEventListener("keydown", tab);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref, open]);
}

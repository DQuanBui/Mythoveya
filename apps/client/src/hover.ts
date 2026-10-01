import { createContext, useEffect, useState } from "react";

// Hovered 3D object, read by the cursor tooltip outside the canvas.
export type HoverInfo = { title: string; hint: string } | null;
let current: HoverInfo = null;
const listeners = new Set<(h: HoverInfo) => void>();
export function setHover(info: HoverInfo, owner?: object) {
  if (!info && owner && owner !== currentOwner) return;
  currentOwner = info ? owner : undefined;
  current = info;
  listeners.forEach((l) => l(info));
}
let currentOwner: object | undefined;
export function useHover() {
  const [hover, setState] = useState<HoverInfo>(current);
  useEffect(() => {
    listeners.add(setState);
    return () => void listeners.delete(setState);
  }, []);
  return hover;
}

// Click-to-walk: objects ask the keeper to walk within `reach` before acting.
export type Walker = {
  go: (target: [number, number], reach?: number, activate?: () => void) => void;
};
export const WalkContext = createContext<{ current: Walker }>({
  current: { go: (_t, _r, activate) => activate?.() },
});

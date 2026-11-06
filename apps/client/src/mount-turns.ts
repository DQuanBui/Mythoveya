import { useEffect, useState } from "react";
// Costly props waiting to appear take turns, one per tick, so a region with
// many of them fills in over a moment instead of freezing while it loads.
const waiting: (() => void)[] = [];
let timer = 0;
const GAP_MS = 60;
function tick() {
  const next = waiting.shift();
  next?.();
  timer = waiting.length ? window.setTimeout(tick, GAP_MS) : 0;
}
/** False until this component's turn comes, then true for good. */
export function useMountTurn() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const grant = () => setReady(true);
    waiting.push(grant);
    timer ||= window.setTimeout(tick, GAP_MS);
    return () => {
      const at = waiting.indexOf(grant);
      if (at >= 0) waiting.splice(at, 1);
    };
  }, []);
  return ready;
}

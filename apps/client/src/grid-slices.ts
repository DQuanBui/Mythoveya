import type { GridBuild } from "../../../packages/shared/pathfind";
/** Runs a grid build in 5 ms slices between frames; returns a cancel function. */
export function buildInSlices(build: GridBuild, done?: () => void) {
  let timer = 0;
  const slice = () => {
    const end = performance.now() + 5;
    if (build.step(() => performance.now() < end)) done?.();
    else timer = window.setTimeout(slice);
  };
  timer = window.setTimeout(slice);
  return () => clearTimeout(timer);
}

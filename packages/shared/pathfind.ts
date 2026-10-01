// Grid A* for click-to-walk. Paths are smoothed with line-of-sight checks
// against the same `allowed` rule the keeper's movement uses.
import type { Point } from "./haven";

export type WalkGrid = {
  extent: number;
  cell: number;
  size: number;
  open: Uint8Array;
};
export function buildGrid(
  allowed: (x: number, z: number) => boolean,
  extent: number,
  cell = 0.5,
): WalkGrid {
  const size = Math.ceil((extent * 2) / cell),
    open = new Uint8Array(size * size);
  // A cell is open only if its centre and four near-edge points are walkable,
  // so thin props such as lamp posts can never hide between two open centres.
  const r = cell * 0.44;
  for (let gz = 0; gz < size; gz++)
    for (let gx = 0; gx < size; gx++) {
      const x = -extent + (gx + 0.5) * cell,
        z = -extent + (gz + 0.5) * cell;
      open[gz * size + gx] =
        allowed(x, z) &&
        allowed(x + r, z) &&
        allowed(x - r, z) &&
        allowed(x, z + r) &&
        allowed(x, z - r)
          ? 1
          : 0;
    }
  return { extent, cell, size, open };
}
const toCell = (g: WalkGrid, v: number) =>
  Math.max(0, Math.min(g.size - 1, Math.floor((v + g.extent) / g.cell)));
const center = (g: WalkGrid, c: number) => -g.extent + (c + 0.5) * g.cell;
function nearestOpen(g: WalkGrid, x: number, z: number, radius: number) {
  const cx = toCell(g, x),
    cz = toCell(g, z);
  let best = -1,
    distance = Infinity;
  for (let r = 0; r <= radius && best < 0; r++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const gx = cx + dx,
          gz = cz + dz;
        if (gx < 0 || gz < 0 || gx >= g.size || gz >= g.size) continue;
        const i = gz * g.size + gx;
        if (!g.open[i]) continue;
        const d = Math.hypot(center(g, gx) - x, center(g, gz) - z);
        if (d < distance) {
          distance = d;
          best = i;
        }
      }
  return best;
}
export function lineClear(
  a: Point,
  b: Point,
  allowed: (x: number, z: number) => boolean,
  step = 0.2,
) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    steps = Math.max(1, Math.ceil(length / step));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!allowed(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
      return false;
  }
  return true;
}
/** Returns waypoints from `from` (exclusive) toward `to`, or null if unreachable. */
export function findPath(
  g: WalkGrid,
  from: Point,
  to: Point,
  allowed: (x: number, z: number) => boolean,
): Point[] | null {
  if (allowed(...to) && lineClear(from, to, allowed)) return [to];
  const start = nearestOpen(g, from[0], from[1], 3),
    goal = nearestOpen(g, to[0], to[1], 8);
  if (start < 0 || goal < 0) return null;
  const n = g.size * g.size,
    cost = new Float32Array(n).fill(Infinity),
    parent = new Int32Array(n).fill(-1),
    closed = new Uint8Array(n),
    heap: number[] = [],
    score = new Float32Array(n);
  const gx = goal % g.size,
    gz = Math.floor(goal / g.size);
  const h = (i: number) => {
    const dx = Math.abs((i % g.size) - gx),
      dz = Math.abs(Math.floor(i / g.size) - gz);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  const push = (i: number) => {
    heap.push(i);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (score[heap[p]] <= score[heap[c]]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1,
          r = l + 1;
        let m = c;
        if (l < heap.length && score[heap[l]] < score[heap[m]]) m = l;
        if (r < heap.length && score[heap[r]] < score[heap[m]]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  cost[start] = 0;
  score[start] = h(start);
  push(start);
  let found = false;
  while (heap.length) {
    const i = pop();
    if (closed[i]) continue;
    if (i === goal) {
      found = true;
      break;
    }
    closed[i] = 1;
    const x = i % g.size,
      z = Math.floor(i / g.size);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = x + dx,
          nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= g.size || nz >= g.size) continue;
        const j = nz * g.size + nx;
        if (!g.open[j] || closed[j]) continue;
        // No corner cutting past a blocked neighbor.
        if (dx && dz && (!g.open[z * g.size + nx] || !g.open[nz * g.size + x]))
          continue;
        const next = cost[i] + (dx && dz ? Math.SQRT2 : 1);
        if (next < cost[j]) {
          cost[j] = next;
          parent[j] = i;
          score[j] = next + h(j);
          push(j);
        }
      }
  }
  if (!found) return null;
  const cells: Point[] = [];
  for (let i = goal; i >= 0 && i !== start; i = parent[i])
    cells.unshift([center(g, i % g.size), center(g, Math.floor(i / g.size))]);
  if (allowed(...to)) cells.push(to);
  // Pull the string: keep only the corners needed to stay on open ground.
  const smooth: Point[] = [];
  let anchor = from,
    k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--)
      if (lineClear(anchor, cells[j], allowed)) {
        far = j;
        break;
      }
    smooth.push(cells[far]);
    anchor = cells[far];
    k = far + 1;
  }
  return smooth;
}

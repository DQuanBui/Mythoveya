// Browser replacement for the node:crypto functions the game modules use,
// aliased in by the standalone (GitHub Pages) build.
export const randomUUID = () => crypto.randomUUID();
/** Uniform integer in [min, max), like node:crypto randomInt. */
export function randomInt(min: number, max: number) {
  const range = max - min,
    limit = 0x100000000 - (0x100000000 % range),
    value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return min + (value[0] % range);
}

/** A tileable field of soft blobs, values 0-255, for cloud shadows on the ground.
 * Built from whole-number waves so its edges meet when it repeats. */
export function cloudField(size = 64) {
  const data = new Uint8Array(size * size);
  const waves = [
    [1, 0, 0.3], [0, 1, 1.1], [1, 1, 2.3], [2, 1, 4.1], [1, 2, 0.7],
    [3, 1, 5.3], [2, 3, 3.1], [4, 2, 1.9], [3, 4, 2.7], [5, 3, 0.9],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0,
        total = 0;
      waves.forEach(([a, b, phase], i) => {
        const weight = 1 / (1 + i * 0.35);
        v += Math.sin(((a * x + b * y) / size) * Math.PI * 2 + phase) * weight;
        total += weight;
      });
      data[y * size + x] = Math.round((0.5 + (0.5 * v) / total) * 255);
    }
  return data;
}
/** How strongly clouds shade the sun now: by day and under open sky only,
 * since rain and mist already grey the light. */
export const cloudAmount = (day: number, cover: number, enabled: boolean) =>
  enabled ? 0.7 * Math.max(0, Math.min(1, day)) * Math.max(0, 1 - cover * 1.6) : 0;

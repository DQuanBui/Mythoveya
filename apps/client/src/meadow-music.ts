import { MEADOW_TONES } from "../../../packages/shared/meadow";
import { audio, settings } from "./audio";
let nextPlayback = 0;
/** Short chimes use the existing sound-effects bus and respect global mute. */
export async function playMeadowMelody(notes: readonly number[]) {
  if (settings.mute || settings.sfx === 0 || !notes.length || notes.length > 4)
    return;
  if (notes.some((n) => !MEADOW_TONES[n])) return;
  await audio.unlock();
  if (!audio.ctx || audio.ctx.state !== "running") return;
  const now = audio.ctx.currentTime;
  // Bound overlapping replay clicks; single chimes remain responsive.
  if (notes.length > 1 && now < nextPlayback) return;
  notes.forEach((n, i) => {
    const hz = MEADOW_TONES[n].hz;
    audio.tone(hz, hz, 0.38, "sine", 0.13, "sfx", now + i * 0.42);
  });
  if (notes.length > 1) nextPlayback = now + notes.length * 0.42;
}

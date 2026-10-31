import { useEffect, useState } from "react";
import { audio } from "./audio";
import { PHOTO_FILTERS, photo, photoCss, type PhotoFilter } from "./photo";

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");

/** Draws the grabbed frame with the chosen filter, vignette and caption, then downloads it. */
async function save(data: string, filter: PhotoFilter, frame: boolean, caption: string) {
  const img = new Image();
  img.src = data;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d")!;
  g.filter = photoCss(filter);
  g.drawImage(img, 0, 0);
  g.filter = "none";
  if (frame) {
    const v = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(20,12,6,0.55)");
    g.fillStyle = v;
    g.fillRect(0, 0, c.width, c.height);
    const size = Math.round(c.height * 0.028);
    g.font = `600 ${size}px Georgia, serif`;
    g.textAlign = "right";
    g.fillStyle = "rgba(255,246,226,0.92)";
    g.shadowColor = "rgba(0,0,0,0.5)";
    g.shadowBlur = size * 0.4;
    g.fillText(caption, c.width - size, c.height - size);
  }
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw Error("This browser could not save the photo.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mythoveya-${stamp()}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Photo mode: the HUD is hidden, the scene keeps playing, and this small
 * bar picks a filter and frame and saves a picture. */
export function PhotoMode({
  filter,
  setFilter,
  caption,
  close,
  pose,
}: {
  filter: PhotoFilter;
  setFilter: (f: PhotoFilter) => void;
  caption: string;
  close: () => void;
  pose: () => void;
}) {
  const [frame, setFrame] = useState(true),
    [status, setStatus] = useState("");
  const shoot = async () => {
    const data = photo.grab?.();
    if (!data) return setStatus("The camera isn't ready yet.");
    audio.cue("shutter");
    setStatus("Saving…");
    try {
      await save(data, filter, frame, caption);
      setStatus("Photo saved to your downloads.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save the photo.");
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyP") close();
      else if (e.code === "KeyG") pose();
      else if (e.code === "Enter" && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)) shoot();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <>
      {frame && <div className="photo-frame" aria-hidden="true"><span>{caption}</span></div>}
      <div className="photo-bar" role="toolbar" aria-label="Photo mode">
        <div className="photo-filters" role="radiogroup" aria-label="Filter">
          {PHOTO_FILTERS.map((f) => (
            <button key={f.id} role="radio" aria-checked={filter === f.id} className={filter === f.id ? "selected" : ""} onClick={() => setFilter(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
        <label className="photo-toggle">
          <input type="checkbox" checked={frame} onChange={(e) => setFrame(e.target.checked)} /> Frame
        </label>
        <button onClick={pose} title="Your keeper waves and your companion cheers for about three seconds">
          ✋ Pose <kbd>G</kbd>
        </button>
        <button className="primary" onClick={shoot}>
          📷 Take photo <kbd>Enter</kbd>
        </button>
        <button onClick={close}>
          Done <kbd>Esc</kbd>
        </button>
        <small role="status">{status || "Drag to turn the camera · WASD to move"}</small>
      </div>
    </>
  );
}

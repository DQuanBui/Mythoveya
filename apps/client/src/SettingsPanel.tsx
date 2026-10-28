import { useState } from "react";
import { audio, settings, type Settings } from "./audio";
import { exportSave, importSave, STANDALONE } from "./api";

export function SettingsPanel() {
  const [, refresh] = useState(0);
  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings[key] = value;
    audio.update();
    refresh((x) => x + 1);
  }
  return (
    <>
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h2>Sound & atmosphere</h2>
      <div className="settings-grid">
        {(["master", "music", "sfx", "ambience", "voices"] as const).map(
          (key) => (
            <label className="slider" key={key}>
              <span>
                {key === "sfx"
                  ? "Sound effects"
                  : key === "voices"
                    ? "Creature voices"
                    : key}{" "}
                <b>{Math.round(settings[key] * 100)}%</b>
              </span>
              <input
                aria-label={`${key} volume`}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            </label>
          ),
        )}
      </div>
      <div className="settings-grid">
        {(["mute", "reduced", "shake", "daynight", "contrast"] as const).map((key) => (
          <label className="toggle" key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => change(key, e.target.checked)}
            />
            {key === "mute"
              ? "Mute all sound"
              : key === "reduced"
                ? "Reduced motion"
                : key === "daynight"
                  ? "Day and night cycle"
                  : key === "contrast"
                    ? "High-contrast interface"
                    : "Camera shake"}
          </label>
        ))}
        <label className="slider">
          <span>
            World brightness <b>{Math.round(settings.brightness * 100)}%</b>
          </span>
          <input
            aria-label="World brightness"
            type="range"
            min="0.7"
            max="1.4"
            step=".05"
            value={settings.brightness}
            onChange={(e) => change("brightness", Number(e.target.value))}
          />
        </label>
        <label className="slider">
          Graphics quality
          <select
            value={settings.quality}
            onChange={(e) => change("quality", e.target.value)}
          >
            {["Low", "Medium", "High"].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Graphics density updates when you enter another area. All sounds are
        composed and synthesized locally.
      </p>
      <button
        onClick={async () => {
          await audio.unlock();
          audio.cue("light");
          setTimeout(() => audio.voice("emberfox"), 400);
        }}
      >
        Play sound test ♫
      </button>
      {STANDALONE && <SaveBackup />}
    </>
  );
}

/** The online build keeps its save in this browser; let players move it. */
function SaveBackup() {
  const [message, setMessage] = useState("");
  function download() {
    const url = URL.createObjectURL(
      new Blob([exportSave()], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mythoveya-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Save downloaded. Keep the file somewhere safe.");
  }
  async function restore(file?: File) {
    if (!file) return;
    if (!window.confirm("Replace the save in this browser with this file?"))
      return;
    try {
      importSave(await file.text());
      location.reload();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <div className="save-backup">
      <h3>Your browser save</h3>
      <p className="muted">
        The online game saves in this browser only. Download a backup before
        clearing site data, or to continue in another browser.
      </p>
      <div className="button-row">
        <button onClick={download}>Download save</button>
        <label className="file-button">
          Restore from file
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => restore(e.target.files?.[0])}
          />
        </label>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </div>
  );
}

import { useState } from "react";
import { audio, settings, type Settings } from "./audio";

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
    </>
  );
}

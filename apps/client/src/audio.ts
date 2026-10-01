import { MUSIC, CUES } from "../../../packages/shared/audio-content";
import { byId } from "../../../packages/shared/content";
export type Settings = {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  voices: number;
  mute: boolean;
  reduced: boolean;
  shake: boolean;
  quality: string;
  daynight: boolean;
};
export const defaults: Settings = {
  master: 0.6,
  music: 0.45,
  sfx: 0.65,
  ambience: 0.35,
  voices: 0.5,
  mute: false,
  reduced: false,
  shake: false,
  quality: "Medium",
  daynight: true,
};
function storedSettings() {
  try {
    return JSON.parse(localStorage.getItem("mythoveya-settings") || "{}");
  } catch {
    return {};
  }
}
export const settings: Settings = {
  ...defaults,
  ...storedSettings(),
};
class AudioEngine {
  ctx?: AudioContext;
  master?: GainNode;
  buses: Record<string, GainNode> = {};
  voices = 0;
  scene = "";
  timer?: ReturnType<typeof setInterval>;
  beat = 0;
  next = 0;
  last = new Map<string, number>();
  musicGain?: GainNode;
  ambientBeat = 0;
  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -16;
      limiter.ratio.value = 5;
      this.master.connect(limiter).connect(this.ctx.destination);
      for (const bus of ["music", "sfx", "ambience", "voices"]) {
        this.buses[bus] = this.ctx.createGain();
        this.buses[bus].connect(this.master);
      }
      this.update();
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.ctx?.suspend();
        else this.ctx?.resume();
      });
      this.timer = setInterval(() => this.schedule(), 100);
    }
    await this.ctx.resume();
  }
  update() {
    document.documentElement.dataset.reduced = String(settings.reduced);
    localStorage.setItem("mythoveya-settings", JSON.stringify(settings));
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(
      settings.mute ? 0 : settings.master,
      this.ctx.currentTime,
      0.05,
    );
    for (const k of ["music", "sfx", "ambience", "voices"] as const)
      this.buses[k].gain.setTargetAtTime(
        settings[k],
        this.ctx.currentTime,
        0.08,
      );
  }
  tone(
    freq: number,
    end: number,
    duration: number,
    wave: OscillatorType,
    gain: number,
    bus: string,
    when?: number,
    pan = 0,
  ) {
    if (!this.ctx || this.voices >= 40 || document.hidden) return;
    const c = this.ctx,
      t = when ?? c.currentTime,
      o = c.createOscillator(),
      v = c.createGain(),
      p = c.createStereoPanner();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(25, end), t + duration);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.025);
    v.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
    o.connect(v)
      .connect(p)
      .connect(
        bus === "music" && this.musicGain ? this.musicGain : this.buses[bus],
      );
    o.start(t);
    o.stop(t + duration + 0.02);
    this.voices++;
    o.onended = () => {
      o.disconnect();
      v.disconnect();
      p.disconnect();
      this.voices--;
    };
  }
  noise(duration: number, gain: number, bus: string, cutoff = 800) {
    if (!this.ctx || this.voices >= 40 || document.hidden) return;
    const c = this.ctx,
      len = Math.floor(c.sampleRate * duration),
      buffer = c.createBuffer(1, len, c.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      v = c.createGain();
    src.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    v.gain.value = gain;
    src.connect(filter).connect(v).connect(this.buses[bus]);
    src.start();
    this.voices++;
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      v.disconnect();
      this.voices--;
    };
  }
  cue(name: string, pan = 0, bus = "sfx") {
    const cue = CUES[name] || CUES.confirm;
    if (!this.ctx || Date.now() - (this.last.get(name) || 0) < 65) return;
    this.last.set(name, Date.now());
    const [wave, f, e, d, n, notes] = cue;
    this.tone(f, e, d, wave, 0.09, bus, undefined, pan);
    notes.forEach((x, i) =>
      this.tone(
        f * 2 ** (x / 12),
        f * 2 ** (x / 12),
        d * 0.65,
        wave,
        0.045,
        bus,
        this.ctx!.currentTime + i * 0.09,
        pan,
      ),
    );
    if (n) this.noise(d, 0.09 * n, bus, name === "frost" ? 2400 : 850);
    if (["rare", "victory", "defeat", "quest"].includes(name)) {
      this.buses.music.gain.setTargetAtTime(
        settings.music * 0.3,
        this.ctx.currentTime,
        0.1,
      );
      this.buses.music.gain.setTargetAtTime(
        settings.music,
        this.ctx.currentTime + d,
        0.4,
      );
    }
  }
  voice(id: string, kind = "call", pan = 0, attenuation = 1) {
    const s = byId[id];
    if (!s || !this.ctx) return;
    const f = 180 + (5 - Math.floor(s.index / 10)) * 65 + (s.index % 10) * 12;
    const factors: Record<string, number> = {
      insect: 1.7,
      bird: 2,
      amphibian: 0.8,
      fox: 1.1,
      quadruped: 0.95,
      shell: 0.6,
      serpent: 0.7,
      aquatic: 0.85,
      spirit: 1.4,
      golem: 0.28,
      dragon: 0.45,
      antler: 0.9,
    };
    const base = f * (factors[s.family] || 1);
    this.tone(
      base,
      base * (kind === "hurt" ? 0.7 : kind === "attack" ? 1.35 : 1.15),
      0.25 + s.variant * 0.04,
      s.index % 3 ? "sine" : "triangle",
      0.12 * Math.max(0, Math.min(1, attenuation)),
      "voices",
      undefined,
      pan,
    );
    if (["dragon", "golem", "shell"].includes(s.family))
      this.noise(0.32, 0.08 * attenuation, "voices", 350);
  }
  ultimate(id: string) {
    const s = byId[id];
    if (!this.ctx || s.tier !== "S") return;
    const motifs = [
      [0, 7, 12, 19],
      [0, 5, 9, 12],
      [0, 4, 7, 9, 12],
      [0, 0, 7, 5],
      [0, 7, 14, 10, 19],
      [12, 7, 3, 14],
      [0, 4, 7, 12, 16],
      [0, 1, 7, 3, -5],
      [0, 7, 9, 12, 7, 4],
      [0, 3, 10, 7, 14],
    ];
    const root = 150 + (s.index - 50) * 17;
    motifs[s.index - 50].forEach((n, i) => {
      const f = root * 2 ** (n / 12);
      this.tone(
        f,
        f,
        0.65,
        s.index % 2 ? "sine" : "triangle",
        0.045,
        "sfx",
        this.ctx!.currentTime + i * 0.13,
      );
    });
  }
  location(scene: string) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.beat = 0;
    this.next = this.ctx?.currentTime || 0;
    if (this.ctx) {
      const old = this.musicGain;
      old?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      if (old) setTimeout(() => old.disconnect(), 2500);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.buses.music);
      this.musicGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.8);
    }
  }
  schedule() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const song = MUSIC[this.scene as keyof typeof MUSIC] || MUSIC.title;
    const step = 60 / song.bpm / 2;
    if (this.next < this.ctx.currentTime - 0.2)
      this.next = this.ctx.currentTime;
    while (this.next < this.ctx.currentTime + 0.2) {
      const bar = Math.floor(this.beat / 8) % 16,
        chord = [0, 5, 3, 7][Math.floor(bar / 4)],
        note =
          song.pattern[this.beat % 8] +
          song.root +
          chord +
          (this.beat >= 128 && this.beat % 3 === 0 ? 12 : 0);
      const hz = 440 * 2 ** ((note - 69) / 12);
      if (
        this.beat % 2 === 0 ||
        this.scene === "battle" ||
        this.scene === "arena"
      )
        this.tone(hz, hz, step * 2.8, song.wave, 0.04, "music", this.next);
      if (this.beat % 8 === 0) {
        for (const n of [0, 7, 12]) {
          const f = 440 * 2 ** ((song.root + chord - 12 + n - 69) / 12);
          this.tone(f, f, step * 7, "sine", 0.035, "music", this.next);
        }
      }
      if (
        this.beat % 4 === 0 &&
        ["battle", "boss", "arena", "canyon"].includes(this.scene)
      )
        this.tone(70, 35, 0.18, "sine", 0.06, "music", this.next);
      this.next += step;
      this.beat = (this.beat + 1) % song.steps;
    }
    if (
      ++this.ambientBeat % 45 === 0 &&
      ["haven", "meadow", "canyon", "hollow"].includes(this.scene)
    )
      this.cue(
        this.scene === "hollow"
          ? "chime"
          : this.scene === "canyon"
            ? "wind"
            : "leaves",
        0,
        "ambience",
      );
  }
}
export const audio = new AudioEngine();

import * as T from "three";

const textures = new Map<string, T.Texture>();
/** A camera-facing sprite showing one glyph ("Z", "!", "?", "♥"), with a soft
 * dark outline so it reads on grass, snow and sky alike. Sprites share one
 * texture per glyph and colour but get their own material, so each can fade
 * on its own. Returns null outside the browser (Node tests). */
export function glyphSprite(glyph: string, color = "#ffffff", size = 0.3) {
  if (typeof document === "undefined") return null;
  const key = glyph + color;
  if (!textures.has(key)) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (!g) return null;
    g.font = "bold 50px Georgia, 'Times New Roman', serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 7;
    g.strokeStyle = "rgba(20, 34, 40, 0.75)";
    g.strokeText(glyph, 32, 35);
    g.fillStyle = color;
    g.fillText(glyph, 32, 35);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    textures.set(key, t);
  }
  const s = new T.Sprite(new T.SpriteMaterial({ map: textures.get(key)!, transparent: true, depthWrite: false }));
  s.scale.setScalar(size);
  s.renderOrder = 5;
  return s;
}

/** A soft round glow texture for mist, puffs and other billboards. */
export function softDot() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!,
    gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

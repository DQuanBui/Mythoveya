// A short, private-safe description of this device and session, for a player
// to paste into a bug report. No save contents, names or tokens.
const errors: string[] = [];
/** Remembers the latest page errors, for the report. Started once from main. */
export function watchErrors() {
  const keep = (message: string) => {
    errors.push(`${new Date().toISOString().slice(11, 19)} ${message.slice(0, 200)}`);
    if (errors.length > 8) errors.shift();
  };
  addEventListener("error", (e) => keep(e.message || "Unknown error"));
  addEventListener("unhandledrejection", (e) => keep(String((e.reason as Error)?.message ?? e.reason)));
}
export type ReportInfo = {
  build: string;
  online: boolean;
  agent: string;
  screen: string;
  graphics: string;
  where: string;
  settings: Record<string, unknown>;
  errors: string[];
};
export function formatReport(info: ReportInfo) {
  return [
    "Mythoveya problem report",
    `Build: ${info.build} (${info.online ? "online" : "local server"})`,
    `Browser: ${info.agent}`,
    `Screen: ${info.screen}`,
    `Graphics: ${info.graphics}`,
    `Where: ${info.where}`,
    `Settings: ${Object.entries(info.settings)
      .map(([k, v]) => `${k}=${typeof v === "number" ? Math.round(v * 100) / 100 : v}`)
      .join(", ")}`,
    `Recent errors: ${info.errors.length ? "" : "none"}`,
    ...info.errors.map((e) => `  ${e}`),
    "What happened, and what did you expect?",
    "",
  ].join("\n");
}
function graphics() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
    if (!gl) return "no WebGL";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    return "unknown";
  }
}
/** Everything the report needs, read from the page now. */
export function collectReport(where: string, online: boolean, settings: Record<string, unknown>) {
  return formatReport({
    build: (import.meta.env.VITE_BUILD as string | undefined) || "dev",
    online,
    agent: navigator.userAgent,
    screen: `${innerWidth}×${innerHeight} at ${devicePixelRatio}x, ${matchMedia("(pointer: coarse)").matches ? "touch" : "pointer"}`,
    graphics: graphics(),
    where,
    settings,
    errors: [...errors],
  });
}

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
// `vite build --mode pages` makes the static GitHub Pages build. It runs the
// server's game modules in the browser, so their SQLite store and node:crypto
// imports are swapped for browser versions. Other modes replace the in-page
// server with a stub so its Node-only modules are never bundled.
const STUB = "\0mythoveya-local-server-stub";
const standaloneServer = (pages: boolean): Plugin => ({
  name: "mythoveya-standalone-server",
  enforce: "pre",
  resolveId(source, importer) {
    if (!pages)
      return source === "./local-server" && importer?.endsWith("api.ts") ? STUB : undefined;
    if (source === "node:crypto") return resolve("apps/server/browser-crypto.ts");
    if (source === "./store" && importer && /[\\/]apps[\\/]server[\\/]/.test(importer))
      return resolve("apps/server/browser-store.ts");
  },
  load(id) {
    if (id === STUB)
      return "export const localApi = () => { throw Error('The in-page server is only in the Pages build.'); };";
  },
});
export default defineConfig(({ mode }) => ({
  root: "apps/client",
  base: mode === "pages" ? process.env.PAGES_BASE || "/Mythoveya/" : "/",
  plugins: [react(), standaloneServer(mode === "pages")],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.CLIENT_PORT || 5173),
    strictPort: true,
    proxy: {
      "/api": { target: `http://127.0.0.1:${process.env.SERVER_PORT || 2567}` },
      "/matchmake": {
        target: `http://127.0.0.1:${process.env.SERVER_PORT || 2567}`,
      },
      "/socket": {
        target: `http://127.0.0.1:${process.env.SERVER_PORT || 2567}`,
        ws: true,
        rewrite: (p) => p.replace(/^\/socket/, ""),
      },
    },
  },
  preview: { host: "127.0.0.1" },
  build: {
    outDir: mode === "pages" ? "../../dist/pages" : "../../dist/client",
    emptyOutDir: true,
  },
}));

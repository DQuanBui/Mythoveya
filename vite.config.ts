import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "apps/client",
  plugins: [react()],
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
  build: { outDir: "../../dist/client", emptyOutDir: true },
});

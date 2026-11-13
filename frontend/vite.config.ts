import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const apiOrigin = process.env.FRONTEND_API_ORIGIN ?? "http://127.0.0.1:4000";
const frontendPort = Number(process.env.FRONTEND_PORT ?? "5173");

export default defineConfig({
  plugins: [
    tailwindcss(),
    solid({
      diagnostics: true,
      solid: {
        moduleName: "solid-pixi",
        generate: "universal",
      },
    }),
  ],
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiOrigin,
      },
      "/socket": {
        target: apiOrigin,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../backend/priv/static",
    emptyOutDir: false,
  },
});

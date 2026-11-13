import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vitest/config";

// Keep unit tests independent of the browser-only solid-pixi Vite transform.
export default defineConfig({
  plugins: [solid({ solid: { moduleName: "@solidjs/web", generate: "dom" } })],
  resolve: { conditions: ["browser"] },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

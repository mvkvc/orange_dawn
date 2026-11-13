import { defineConfig } from "vitest/config";

// Keep unit tests independent of the browser-only solid-pixi Vite transform.
export default defineConfig({
  resolve: { conditions: ["browser"] },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

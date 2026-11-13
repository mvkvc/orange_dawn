import { defineConfig } from "vitest/config";

// Keep unit tests independent of the browser-only solid-pixi Vite transform.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

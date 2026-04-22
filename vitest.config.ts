import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});


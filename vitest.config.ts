import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["lib/**/*.ts"],
      thresholds: { lines: 75, functions: 75, branches: 65, statements: 75 },
    },
  },
});

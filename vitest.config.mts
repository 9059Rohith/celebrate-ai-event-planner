import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export const libraryCoverageThresholds = {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
};
export const domainCoverageThresholds = {
  lines: 90,
  functions: 90,
  branches: 90,
  statements: 90,
};
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    maxWorkers: 2,
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["lib/**/*.ts"],
      thresholds: {
        ...libraryCoverageThresholds,
        "lib/domain/**/*.ts": domainCoverageThresholds,
      },
    },
  },
});

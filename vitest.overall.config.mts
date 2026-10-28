import { defineConfig } from "vitest/config";
import base, {
  domainCoverageThresholds,
  libraryCoverageThresholds,
} from "./vitest.config.mjs";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.ts",
        "evals/**/*.ts",
        "middleware.ts",
        "public/**/*.js",
      ],
      thresholds: {
        lines: 80,
        "lib/**/*.ts": libraryCoverageThresholds,
        "lib/domain/**/*.ts": domainCoverageThresholds,
      },
    },
  },
});

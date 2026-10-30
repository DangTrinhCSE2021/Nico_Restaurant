import { defineConfig } from "vitest/config";

// Unit tests for the pure modules (domain, data, i18n). `@/` resolves through tsconfig paths.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

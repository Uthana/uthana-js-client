import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30_000,
    setupFiles: [resolve(__dirname, "tests/setup.ts")],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "packages/**/tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environmentMatchGlobs: [["tests/**/test_hooks*", "jsdom"]],
  },
  resolve: {
    alias: {
      "@uthana/client": resolve(__dirname, "packages/client/src/index.ts"),
      "@uthana/react": resolve(__dirname, "packages/react/src/index.ts"),
      react: resolve(__dirname, "node_modules/react"),
      "react-dom": resolve(__dirname, "node_modules/react-dom"),
    },
  },
});

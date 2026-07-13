import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["components/**/*.{ts,tsx}", "lib/send-flow.ts"],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
    },
  },
});

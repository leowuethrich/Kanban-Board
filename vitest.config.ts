import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Unit-Tests laufen in Node ohne DOM — es werden nur reine Funktionen aus lib/
// geprüft (Reducer, Rate-Limit-Fensterlogik). Kein jsdom nötig.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});

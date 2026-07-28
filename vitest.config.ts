import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The integration check talks to the real Supabase project, so it needs
    // credentials and a network. `npm run test:integration` runs it explicitly.
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
  },
});

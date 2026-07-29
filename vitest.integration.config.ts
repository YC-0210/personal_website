import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The one thin integration check against the real Supabase project. Kept out of
 * the default suite because it needs credentials and a network; run it with
 * `npm run test:integration` after exporting the values from .env.local.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // Real network round-trips, so the default 5s is too tight.
    testTimeout: 30_000,
  },
});

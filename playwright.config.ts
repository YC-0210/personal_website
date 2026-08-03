import { defineConfig, devices } from "@playwright/test";

/**
 * The browser checks. There is exactly one thing here that the Vitest suite
 * cannot do: confirm that a control the visitor is meant to click is actually
 * the thing under the cursor.
 *
 * The Sphere's screen is an opaque, lifted panel with a WebGL canvas on it, so
 * a fixed control that forgets its z-index is painted over — present in the
 * DOM, correct in every unit test, and invisible on the page. That has already
 * shipped twice: to the Dossier, and to every one of the Owner's controls
 * including the sign-in dot.
 *
 * Supabase is stubbed at the network boundary, so this needs no project and no
 * secrets — the env vars below only have to exist for the client to be built.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "on-first-retry",
  },
  /**
   * Both are Chromium: the Dossier splits at the `md` breakpoint into a side
   * card and the Compact Bar, so what matters is viewport and touch, not the
   * engine. One browser to install keeps CI cheap.
   */
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  /**
   * Built here rather than reusing whatever `.next` happens to be lying about:
   * `NEXT_PUBLIC_*` is inlined at build time, so the stub only takes effect if
   * the build sees it. `NEXT_DIST_DIR` keeps that stubbed build out of the way
   * of the real one.
   */
  webServer: {
    command: "npm run build && npm run start -- --port 3210",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: "https://stub.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-key",
    },
    timeout: 180_000,
  },
});

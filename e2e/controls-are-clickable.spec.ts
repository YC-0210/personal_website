import { expect, test } from "@playwright/test";

import {
  isTopmostAtItsCentre,
  scrollToSphere,
  signInAsOwner,
  stubSupabase,
} from "./sphere";

/**
 * Every control on the Sphere must be the element that receives a click at its
 * own centre — not merely present, and not merely visible.
 *
 * The Sphere's screen is opaque and lifted (`z-10`), so a fixed control left at
 * `z-auto` is painted over by the WebGL canvas. It then passes every unit test,
 * renders in the DOM, reports a sensible bounding box, and cannot be clicked.
 * That shipped twice — the Dossier, then the whole Owner toolchain including
 * the sign-in dot, which is how the Owner lost the ability to edit the site.
 */

test.describe("A Visitor's controls on the Sphere", () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
    await page.goto("/");
    await scrollToSphere(page);
  });

  test("the view toggle and the Articles link take their own clicks", async ({
    page,
  }) => {
    for (const control of [
      page.getByRole("button", { name: /List view|Sphere view/ }),
      page.getByRole("link", { name: "Articles" }),
    ]) {
      await expect(control).toBeVisible();
      expect(await isTopmostAtItsCentre(control)).toBe(true);
    }
  });

  test("the Dossier is not painted under the Sphere it describes", async ({
    page,
    isMobile,
  }) => {
    // Selecting is the scene's job on desktop and the Compact Bar's on mobile;
    // the hash link is the one route into a selection that both share.
    await page.goto("/#atom-a1");
    await scrollToSphere(page);

    if (isMobile) {
      const bar = page.getByRole("button", { name: /Details/ });
      await expect(bar).toBeVisible();
      expect(await isTopmostAtItsCentre(bar)).toBe(true);

      await bar.click();
      const takeover = page.getByRole("region", {
        name: "Classical physics details",
      });
      await expect(takeover).toBeVisible();
      expect(await isTopmostAtItsCentre(takeover)).toBe(true);
      return;
    }

    const dossier = page.getByRole("complementary", {
      name: "Classical physics details",
    });
    await expect(dossier).toBeVisible();
    expect(await isTopmostAtItsCentre(dossier)).toBe(true);
    await expect(dossier).toContainText("Classical physics");
  });
});

test.describe("The Owner's way in", () => {
  test("the sign-in dot can actually be clicked, and its form opens over the scene", async ({
    page,
  }) => {
    await stubSupabase(page);
    await page.goto("/");
    await scrollToSphere(page);

    const dot = page.getByLabel("Owner sign in");
    await expect(dot).toBeVisible();
    // The bug this guards: the dot was here, and the canvas had it.
    expect(await isTopmostAtItsCentre(dot)).toBe(true);

    await dot.click();
    const form = page.getByRole("dialog", { name: "Sign in" });
    await expect(form).toBeVisible();
    expect(await isTopmostAtItsCentre(form)).toBe(true);
  });
});

test.describe("The Owner's controls in Edit Mode", () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
    await signInAsOwner(page);
    await page.goto("/");
    await scrollToSphere(page);
  });

  test("sign out, Add Atom and Connect Atoms all take their own clicks", async ({
    page,
  }) => {
    for (const name of ["Sign out", "Add Atom", "Connect Atoms"]) {
      const control = page.getByRole("button", { name, exact: true });
      await expect(control).toBeVisible();
      expect(await isTopmostAtItsCentre(control)).toBe(true);
    }
  });

  test("the Atom form opens over the scene rather than under it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add Atom", exact: true }).click();

    const form = page.getByRole("dialog", { name: /Atom/ });
    await expect(form).toBeVisible();
    expect(await isTopmostAtItsCentre(form)).toBe(true);
  });
});

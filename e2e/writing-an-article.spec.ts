import { expect, test } from "@playwright/test";

import { scrollToSphere, signInAsOwner, stubSupabase } from "./sphere";

/**
 * The writing surface, and the rule that a Draft is nobody's but the Owner's.
 *
 * ADR-0005 puts the editor in the rendering layer: it is verified in a browser
 * rather than at the store, because "can the Owner actually type into it" is not
 * a question the Vitest suite can answer. The store tests hold the draft rule
 * itself; these hold that the pages in front of it obey it.
 *
 * The Supabase stub hands every row to everyone, so a Visitor here receives the
 * Draft and its Bonding over the wire and must still not show them. In
 * production RLS refuses both before they leave the database — this is the near
 * side of that same rule, which is the side a client bug can break.
 */

test.describe("The Owner writing an Article", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page);
    await stubSupabase(page);
  });

  test("opens the desk and types into it", async ({ page }) => {
    test.skip(
      test.info().project.name !== "desktop",
      "Writing is desktop-only by decision — the phone case is its own test.",
    );

    await page.goto("/articles/art1/edit");

    // The title is a labelled field above the rule, not the body's first line:
    // direction B's hard separation.
    await expect(page.getByLabel("TITLE")).toHaveValue("On borrowed metaphors");

    const surface = page.locator('[contenteditable="true"]');
    await expect(surface).toBeVisible();
    await surface.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" And kept it too long.");

    await expect(surface).toContainText("And kept it too long.");
  });

  test("parks the toolbar where it can be reached, and it bolds", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "desktop", "Desktop-only surface.");

    await page.goto("/articles/art1/edit");

    const bold = page.getByRole("button", { name: "Bold" });
    await expect(bold).toBeVisible();

    const surface = page.locator('[contenteditable="true"]');
    await surface.click();
    // Select the first word and bold it.
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await bold.click();

    await expect(surface.locator("strong")).toHaveCount(1);
  });

  test("says a Draft is a Draft, and offers to publish it", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "Desktop-only surface.");

    await page.goto("/articles/art2/edit");

    await expect(page.getByText("Only you can read this.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  });

  test("explains itself on a phone rather than failing", async ({ page }) => {
    test.skip(
      test.info().project.name !== "mobile",
      "This is the phone's behaviour.",
    );

    await page.goto("/articles/art2/edit");

    await expect(
      page.getByRole("heading", { name: "Writing is desktop-only" }),
    ).toBeVisible();
    // The two things a phone can still usefully do are both offered.
    await expect(page.getByRole("link", { name: "Read it" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    // And no editor was rendered underneath the explanation.
    await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  });
});

test.describe("A Draft, from both ends", () => {
  test("is listed for the Owner, badged as a Draft", async ({ page }) => {
    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/articles");

    await expect(page.getByText("Half a thought")).toBeVisible();
    await expect(page.getByText("Draft")).toBeVisible();
  });

  test("is not on a Visitor's Articles list at all", async ({ page }) => {
    await stubSupabase(page);
    await page.goto("/articles");

    await expect(page.getByText("On borrowed metaphors")).toBeVisible();
    await expect(page.getByText("Half a thought")).toHaveCount(0);
    await expect(page.getByText("Draft")).toHaveCount(0);
  });

  /*
   * The next two read the Dossier itself, which on a phone is folded behind the
   * Compact Bar and has to be opened first. What they are checking — which
   * Bondings the store hands over — does not vary by viewport, and the Compact
   * Bar's own behaviour is already held by `controls-are-clickable.spec.ts`, so
   * they run where the Dossier is simply on screen.
   */
  test("does not reach a Visitor through the Atom's Dossier either", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "desktop",
      "The Dossier is behind the Compact Bar on a phone; the rule is the same.",
    );

    await stubSupabase(page);
    await page.goto("/#atom-a1");
    await scrollToSphere(page);

    // The published Article's bond is there; the Draft's is not — even though
    // the stub sent both Bondings down the wire.
    await expect(
      page.getByText("How classical physics connects to economics"),
    ).toBeVisible();
    await expect(
      page.getByText("What the draft owes this Atom"),
    ).toHaveCount(0);
  });

  test("does reach the Owner through the Dossier, so it can be finished", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "desktop",
      "The Dossier is behind the Compact Bar on a phone; the rule is the same.",
    );

    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/#atom-a1");
    await scrollToSphere(page);

    await expect(page.getByText("What the draft owes this Atom")).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

/**
 * A prototype the Owner cannot open is not a prototype. ADR-0004 requires three
 * of them before visual work starts, and the round is only real if all three
 * actually run — the Owner's judgement is the deliverable, and it cannot be
 * given against a build error.
 *
 * That has already happened once: `shared.tsx` imported Placeholder from the
 * standalone `@tiptap/extension-placeholder` rather than from `@tiptap/extensions`,
 * which `starter-kit` already carries. It resolved on the machine that wrote it
 * and on no machine that installed the branch fresh, so the whole round reached
 * the Owner as "Module not found". Nothing in the suite loaded `/proto` at all,
 * so nothing objected.
 *
 * These tests hold the seam the Owner uses: open the route in a browser, and
 * type. The Playwright webServer builds with `npm run build`, so an import that
 * does not resolve fails here rather than in the Owner's terminal.
 *
 * THROWAWAY, like everything under `/proto` — this file goes when #28 lands and
 * the prototypes are deleted.
 */

const DIRECTIONS = [
  { slug: "the-page", name: "The page takes over" },
  { slug: "the-desk", name: "The desk" },
  { slug: "over-the-sphere", name: "Over the Sphere" },
];

test.describe("The round-2 writing prototypes", () => {
  test("the index offers all three directions to choose between", async ({
    page,
  }) => {
    await page.goto("/proto/writing-surface");

    for (const direction of DIRECTIONS) {
      /**
       * Anchored on the href and an *exact* title, not on the link's accessible
       * name: the whole card is one link, so its name includes the thesis prose
       * too. A loose match on "Over the Sphere" is satisfied by C's own thesis
       * ("laid over the Sphere") whatever the title says — which is how the
       * first version of this test survived having that title misspelt.
       */
      const card = page.locator(
        `a[href="/proto/writing-surface/${direction.slug}"]`,
      );
      await expect(card).toBeVisible();
      await expect(card.getByText(direction.name, { exact: true })).toBeVisible();
    }
  });

  for (const direction of DIRECTIONS) {
    test(`"${direction.name}" opens, and the Owner can type into it`, async ({
      page,
    }) => {
      await page.goto(`/proto/writing-surface/${direction.slug}`);

      /**
       * Tiptap mounts client-side (`immediatelyRender: false`), so the
       * contenteditable appearing at all is the proof that the editor module
       * loaded — the exact thing the missing import denied.
       */
      const surface = page.locator('[contenteditable="true"]');
      await expect(surface).toBeVisible();

      await surface.click();
      await page.keyboard.press("End");
      await page.keyboard.type("A sentence the Owner just wrote.");

      await expect(surface).toContainText("A sentence the Owner just wrote.");
    });
  }
});

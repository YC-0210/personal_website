import { expect, test } from "@playwright/test";

import { ONE_PIXEL_PNG, signInAsOwner, stubSupabase } from "./sphere";

/**
 * Putting a picture in an Article.
 *
 * ADR-0005 puts the editor in the rendering layer: the store tests hold what
 * may be uploaded and where it is filed, and these hold the part only a browser
 * can answer — that the gesture reaches the bucket and the picture lands at the
 * caret.
 */

/**
 * Drop a picture on the writing column, or paste one into it.
 *
 * Playwright drives neither gesture natively, so the event is built in the page
 * with a real `File` on it and dispatched at the editor — which is what a
 * browser does, and what ProseMirror's own handlers see.
 */
async function dispatchWithFile(
  page: import("@playwright/test").Page,
  kind: "drop" | "paste",
): Promise<void> {
  await page.evaluate(
    ({ kind, bytes }) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(bytes)], "diagram.png", { type: "image/png" }),
      );

      const editor = document.querySelector('[contenteditable="true"]')!;
      // A drop needs real coordinates: ProseMirror resolves the caret from
      // them and gives up before consulting `handleDrop` if they land nowhere.
      const box = editor.getBoundingClientRect();
      const event =
        kind === "drop"
          ? new DragEvent("drop", {
              dataTransfer: transfer,
              clientX: box.left + box.width / 2,
              clientY: box.top + 4,
              bubbles: true,
              cancelable: true,
            })
          : new ClipboardEvent("paste", {
              clipboardData: transfer,
              bubbles: true,
              cancelable: true,
            });
      editor.dispatchEvent(event);
    },
    { kind, bytes: Array.from(ONE_PIXEL_PNG) },
  );
}

test.describe("The Owner puts an Image in an Article", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page);
    await stubSupabase(page);
    test.skip(
      test.info().project.name !== "desktop",
      "Writing is desktop-only by decision — ADR-0009.",
    );
  });

  test("picks one from the toolbar and it lands in the document", async ({
    page,
  }) => {
    await page.goto("/articles/art1/edit");

    const surface = page.locator('[contenteditable="true"]');
    await surface.click();

    await page.getByRole("button", { name: "Image" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "diagram.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

    const image = surface.locator("img");
    await expect(image).toHaveCount(1);
    // Pointing at the bucket, not at a blob URL that dies with the tab.
    await expect(image).toHaveAttribute("src", /storage\/v1\/object\/public\//);
  });

  test("takes one dropped onto the column", async ({ page }) => {
    await page.goto("/articles/art1/edit");
    const surface = page.locator('[contenteditable="true"]');
    await surface.click();

    await dispatchWithFile(page, "drop");

    await expect(surface.locator("img")).toHaveCount(1);
  });

  test("takes one pasted from the clipboard", async ({ page }) => {
    await page.goto("/articles/art1/edit");
    const surface = page.locator('[contenteditable="true"]');
    await surface.click();

    await dispatchWithFile(page, "paste");

    await expect(surface.locator("img")).toHaveCount(1);
  });

  test("refuses a file that is not an image, and says why", async ({ page }) => {
    await page.goto("/articles/art1/edit");

    const surface = page.locator('[contenteditable="true"]');
    await surface.click();

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });

    // Scoped to the surface's own notice: Next's route announcer is also an
    // `alert`, and matching both is a strict-mode violation rather than a pass.
    await expect(
      page.locator('p[role="alert"]', { hasText: "notes.pdf" }),
    ).toContainText("PNG, JPEG, WebP, GIF or AVIF");
    await expect(surface.locator("img")).toHaveCount(0);
  });

  test("offers alt text once the caret is on a picture", async ({ page }) => {
    await page.goto("/articles/art1/edit");

    const surface = page.locator('[contenteditable="true"]');
    await surface.click();

    // Nothing to describe yet, so the control is not there to be pressed.
    await expect(page.getByRole("button", { name: "Alt text" })).toHaveCount(0);

    await page.getByRole("button", { name: "Image" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "diagram.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

    await surface.locator("img").click();
    const alt = page.getByRole("button", { name: "Alt text" });
    await expect(alt).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept("A one pixel diagram"));
    await alt.click();

    await expect(surface.locator("img")).toHaveAttribute(
      "alt",
      "A one pixel diagram",
    );
  });
});

test.describe("A reader", () => {
  test("sees the Image in a published Article", async ({ page }) => {
    await stubSupabase(page);
    await page.route("**/stub.supabase.co/rest/v1/articles**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify([
          {
            id: "art1",
            title: "On borrowed metaphors",
            body: {
              type: "doc",
              content: [
                {
                  type: "image",
                  attrs: {
                    src: "https://stub.supabase.co/storage/v1/object/public/article-images/art1/one.png",
                    alt: "A borrowed diagram",
                  },
                },
              ],
            },
            deleted_at: null,
            published_at: "2026-08-01T00:00:00Z",
          },
        ]),
      }),
    );

    await page.goto("/articles/art1");

    const image = page.locator("article img, .article-prose img").first();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("alt", "A borrowed diagram");
  });
});

/**
 * The gate that the Articles/Daylog merge created.
 *
 * `WritingSurface` is shared, but an Image is filed under the *Article* it
 * belongs to, in a bucket named for Articles, under the Draft-privacy trade
 * ADR-0010 argues about Articles. None of that is decided for a Daylog Entry,
 * so the surface offers pictures only where there is somewhere to put them —
 * rather than showing a control that would fail, or quietly filing a day's
 * picture under an Article that does not exist.
 */
test.describe("A Daylog Entry, which has nowhere to put a picture", () => {
  test("is not offered one", async ({ page }) => {
    test.skip(
      test.info().project.name !== "desktop",
      "Writing is desktop-only by decision — ADR-0009.",
    );

    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/projects/proj1/log/day2/edit");

    // The surface is open and writable — this is the Entry editor, not a
    // refusal page — and only the picture controls are withheld.
    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Image" })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test("still offers one on an Article, so the gate is the uploader and not the merge", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "desktop", "Desktop-only surface.");

    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/articles/art1/edit");

    await expect(page.getByRole("button", { name: "Image" })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
  });
});

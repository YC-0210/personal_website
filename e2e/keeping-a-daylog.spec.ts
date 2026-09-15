import { expect, test, type Page } from "@playwright/test";

import { scrollToSphere, signInAsOwner, stubSupabase } from "./sphere";

/**
 * The Projects section, and the rule that a Project is nobody's until something
 * in it is published (#35, decision 7).
 *
 * The Supabase stub hands every row to everyone, so a Visitor here receives the
 * unpublished Project, its draft days and its Bonding over the wire and must
 * still show none of them. In production RLS refuses all three before they
 * leave the database — this is the near side of that same rule, which is the
 * side a client bug can break.
 */

test.describe("A Visitor at the Projects", () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
  });

  test("sees only work that has something published in it", async ({ page }) => {
    await page.goto("/projects");

    await expect(page.getByRole("heading", { name: "Knowledge Sphere" })).toBeVisible();
    // The whole decision, in one assertion: a Project the Owner has merely
    // started is not a Project anybody else knows about.
    await expect(
      page.getByRole("heading", { name: "Something unfinished" }),
    ).toHaveCount(0);
  });

  test("is told nothing by the unpublished Project's own URL either", async ({ page }) => {
    await page.goto("/projects/proj2");

    await expect(page.getByText("There is no Project here")).toBeVisible();
    // Not "you may not see this": saying that would confirm it exists.
    await expect(page.getByText("Something unfinished")).toHaveCount(0);
  });

  test("reads the Ledger with the draft days left out of it", async ({ page }) => {
    await page.goto("/projects/proj1");

    await expect(page.getByText("DAYLOG · 2")).toBeVisible();
    await expect(page.getByText("20 Aug", { exact: true })).toBeVisible();
    await expect(page.getByText("Half a thought")).toHaveCount(0);
  });

  test("is shown when the work was last logged, from the published day", async ({ page }) => {
    await page.goto("/projects");

    // 27 August is a draft, so it is not when this was last logged — the date
    // has to read the same for everyone, or the list reorders on sign-in.
    await expect(page.getByText("Last logged 20 August 2026")).toBeVisible();
  });
});

test.describe("The Owner at the Projects", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page);
    await stubSupabase(page);
  });

  test("sees the unfinished work first, badged as a Draft", async ({ page }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { name: "Knowledge Sphere" }),
    ).toBeVisible();

    const names = await page.getByRole("heading", { level: 2 }).allInnerTexts();
    // Nothing published means no date to sort by, and that absence puts it at
    // the top: it is the thing actually being worked on.
    expect(names[0]).toContain("Something unfinished");
    expect(names[0]).toContain("Draft");
  });

  test("reads their own draft days in the Ledger", async ({ page }) => {
    await page.goto("/projects/proj1");

    await expect(page.getByText("DAYLOG · 3")).toBeVisible();
    await expect(page.getByText("27 Aug", { exact: true })).toBeVisible();
  });

  test("can reach their own draft day from the Ledger and keep writing it", async ({ page }) => {
    await page.goto("/projects/proj1");

    await page.getByRole("link", { name: /27 August 2026/ }).click();

    await expect(page).toHaveURL(/\/projects\/proj1\/log\/day2$/);
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByRole("link", { name: /Keep writing/ })).toBeVisible();
  });
});

/**
 * ADR-0012: a day is read on its own page, the way an Article is.
 *
 * The Ledger stays what it was — a scannable column of dates — but the thing
 * behind a row is now an address rather than a disclosure toggle, so a day can
 * be linked to, come back to, and read without the rest of the log shifting
 * under it.
 */
test.describe("A Visitor reading one day", () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
  });

  test("opens a day from the Ledger and gets the whole of it, at its own URL", async ({ page }) => {
    await page.goto("/projects/proj1");

    // The row itself is the way in — not a small control at the end of it.
    await page.getByRole("link", { name: /20 August 2026/ }).click();

    await expect(page).toHaveURL(/\/projects\/proj1\/log\/day1$/);
    // The day is the heading, exactly as it is in the editor and the glossary.
    await expect(
      page.getByRole("heading", { level: 1, name: "20 August 2026" }),
    ).toBeVisible();
    // Everything the Ledger clamped away is simply here now.
    await expect(page.getByText("read as a spiral")).toBeVisible();
  });

  test("reads the Project through, a day at a time, without going back to the Ledger", async ({ page }) => {
    await page.goto("/projects/proj1/log/day1");

    await page.getByRole("link", { name: /18 August 2026/ }).click();

    await expect(page).toHaveURL(/\/projects\/proj1\/log\/day0$/);
    await expect(page.getByText("picked one")).toBeVisible();
    // The oldest day is an end, not a wrap-around, so there is nothing earlier
    // to offer from here.
    await expect(page.getByRole("link", { name: /Earlier/ })).toHaveCount(0);
  });

  test("is never offered the Owner's draft day as the one after this", async ({ page }) => {
    await page.goto("/projects/proj1/log/day1");

    // 27 August is a draft, so for a Visitor it is not the next day — it is not
    // a day at all, and a link to it would be a link to a refusal.
    await expect(page.getByRole("link", { name: /27 August 2026/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Later/ })).toHaveCount(0);
  });

  test("is told nothing by the draft day's own URL", async ({ page }) => {
    await page.goto("/projects/proj1/log/day2");

    await expect(page.getByText("There is no day here")).toBeVisible();
    // Not "you may not read this": saying that would confirm it exists.
    await expect(page.getByText("Half a thought")).toHaveCount(0);
  });
});

/**
 * Select an Atom and return whichever Dossier this viewport actually shows.
 *
 * Both forms are in the DOM at once — the desktop card is `max-md:hidden` and
 * the Takeover is `md:hidden` — so an unscoped `getByText` finds the hidden one
 * and reports it invisible. And on a phone the selection raises the Compact Bar
 * first, which has to be opened before there is a Dossier at all. Neither is a
 * difference in the rule under test; both are #20's design.
 */
async function openDossierOn(page: Page, atomId: string) {
  await page.evaluate((id) => {
    window.location.hash = `#atom-${id}`;
  }, atomId);

  const compactBar = page.getByRole("button", { name: /Details/ });
  if (await compactBar.isVisible().catch(() => false)) await compactBar.click();

  return page.locator("[aria-label$=' details']:visible");
}

test.describe("A Project at the Atom's end", () => {
  test("lists only what this reader may see under WORKED ON", async ({ page }) => {
    await stubSupabase(page);
    await page.goto("/");
    await scrollToSphere(page);

    const dossier = await openDossierOn(page, "a1");

    // Two Projects are bonded to this Atom in the fixtures; only one of them
    // has anything published, so only one may be named here.
    await expect(dossier.getByText("WORKED ON · 1")).toBeVisible();
    await expect(
      dossier.getByText("Where the render loop got learned"),
    ).toBeVisible();
    await expect(dossier.getByText("Something unfinished")).toHaveCount(0);
  });

  test("shows the Owner both, including the one with no Bonding Name", async ({ page }) => {
    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/");
    await scrollToSphere(page);

    const dossier = await openDossierOn(page, "a1");

    await expect(dossier.getByText("WORKED ON · 2")).toBeVisible();
    // A Project's Bonding may carry no Name at all — the row is still a row.
    await expect(dossier.getByText("Something unfinished")).toBeVisible();
  });
});

test.describe("Writing a day", () => {
  test("explains itself on a phone rather than failing", async ({ page }) => {
    test.skip(
      test.info().project.name !== "mobile",
      "This is the phone's case; the desktop opens the editor.",
    );

    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/projects/proj1/log/day2/edit");

    // ADR-0009, inherited by reusing the writing surface. A daily log feels the
    // constraint harder than the Articles do, so the page says so plainly.
    await expect(
      page.getByRole("heading", { name: "Writing is desktop-only" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    await expect(page.getByText("20 August 2026")).toHaveCount(0);
  });

  test("opens the day, not a title, on a desktop", async ({ page }) => {
    test.skip(
      test.info().project.name !== "desktop",
      "Writing is desktop-only by decision — the phone case is its own test.",
    );

    await signInAsOwner(page);
    await stubSupabase(page);
    await page.goto("/projects/proj1/log/day2/edit");

    // A Daylog Entry has no title. The date field stands where the title field
    // stands on an Article, because the day is the heading.
    await expect(page.getByLabel("DAY")).toHaveValue("2026-08-27");
    await expect(page.getByText("TITLE")).toHaveCount(0);
    await expect(page.getByText("27 August 2026")).toBeVisible();
  });
});

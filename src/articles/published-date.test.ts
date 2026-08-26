import { describe, expect, it } from "vitest";

import { publishedOn } from "./published-date";

/**
 * When an Article was last published, as a reader sees it (issue #31).
 *
 * The date is `publishedAt`, which `publishArticle` stamps every time it runs —
 * so re-publishing a corrected Article moves it forward, and autosaving one
 * does not touch it. That half of the rule is held at the store's public API in
 * `published-date-store.test.ts`; this is the reading of the stamp itself.
 */
describe("An Article's published date", () => {
  it("reads the day it was published", () => {
    // Written out rather than numeric: 08/01 is two different days depending on
    // which side of the Atlantic the reader is on, and a date that reads
    // differently by reader is a bug, not a preference.
    expect(publishedOn("2026-08-01T09:15:00.000Z")).toBe("1 August 2026");
  });

  it("says nothing at all for a draft", () => {
    // Not a dash, not "Unpublished", not the day it was started. There is
    // nothing truthful to render, and the Draft badge is already the statement.
    expect(publishedOn(null)).toBeNull();
  });

  it("gives every reader the same day, wherever they are", () => {
    // 23:30 UTC. A reader in Tokyo is nine hours into the 2nd, and a reader in
    // Los Angeles is still on the afternoon of the 1st. The Article was
    // published once, so it has one date.
    expect(publishedOn("2026-08-01T23:30:00.000Z")).toBe("1 August 2026");
    expect(publishedOn("2026-08-02T00:30:00.000Z")).toBe("2 August 2026");
  });

  it("says nothing for a stamp it cannot read", () => {
    // The stamp comes back from Postgres as a string. Anything that is not a
    // date reads as no date rather than as "Invalid Date" on the page.
    expect(publishedOn("not a date")).toBeNull();
    expect(publishedOn("")).toBeNull();
  });
});

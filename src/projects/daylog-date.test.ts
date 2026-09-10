import { describe, expect, it } from "vitest";

import { longDay, shortDay, todayInUtc } from "./daylog-date";

describe("The day a Daylog Entry is filed under", () => {
  it("reads as a short day in the Ledger's date column", () => {
    // Fixed width matters here in a way it does not elsewhere: the Ledger sets
    // these in a column, and "3 Sep" against "20 Aug" would not line up.
    expect(shortDay("2026-08-20")).toBe("20 Aug");
    expect(shortDay("2026-09-03")).toBe("03 Sep");
  });

  it("reads in full where there is room for it", () => {
    expect(longDay("2026-08-20")).toBe("20 August 2026");
  });

  it("reads as nothing at all when the stored value is not a day", () => {
    // The boundary where the column stops being trusted — the rule
    // `atomIdFromHash` already applies. "Invalid Date" in the date column is
    // worse than an empty one.
    for (const value of ["", "not-a-day", "2026-13-45", "2026-08"]) {
      expect(shortDay(value)).toBeNull();
      expect(longDay(value)).toBeNull();
    }
  });

  it("offers today as the day a new Entry is filed under", () => {
    expect(todayInUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/**
 * The day a Daylog Entry is filed under, as a reader sees it (issue #35).
 *
 * One helper for every surface that shows one — the Ledger's date column, the
 * Projects list, the editor's date field — so the log cannot end up spelling
 * the same day two ways on two screens.
 */

/**
 * Fixed, not the reader's own — the same argument `publishedOn` makes for an
 * Article's publish date.
 *
 * A Daylog Entry's date is a `date` column with no time and no zone on it: the
 * Owner says which day the work happened, and that is a fact about the day, not
 * about where it is being read. Resolving it in the reader's zone would shift
 * it by one either side of the Atlantic, and formatting it in their locale
 * would render `20/08/2026` in London and `8/20/2026` in New York.
 *
 * `en-GB`, month spelled out, so there is no digit anywhere to misread.
 */

/**
 * The short months, spelled out here rather than taken from `Intl`, and the reason is narrow:
 * `en-GB`'s short month for September is **"Sept"**, four characters where
 * every other month is three. In prose that is nothing; in the Ledger's date
 * column it is a ragged edge one month in twelve, and the column is the whole
 * reason that direction was chosen.
 */
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The `YYYY-MM-DD` this string names, or null if it names no day.
 *
 * Parsed strictly rather than handed to `new Date`, which accepts far more than
 * a date column can hold and rolls impossible days over rather than refusing
 * them — `2026-13-45` would otherwise become a real date in 2027.
 */
function dayOf(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  // A roll-over means the day did not exist: 31 February parses, as 3 March.
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
}

/** `20 Aug` — what the Ledger's date column carries. Two-digit, so it lines up. */
export function shortDay(date: string): string | null {
  const day = dayOf(date);
  if (day === null) return null;

  const dayOfMonth = String(day.getUTCDate()).padStart(2, "0");
  return `${dayOfMonth} ${SHORT_MONTHS[day.getUTCMonth()]}`;
}

/** `20 August 2026` — for anywhere with room to spell it out. */
export function longDay(date: string): string | null {
  const day = dayOf(date);
  return day === null ? null : LONG.format(day);
}

/**
 * Today, as a `YYYY-MM-DD` a new Entry can be filed under.
 *
 * In UTC, matching how every stored day is read back. The Owner can change it —
 * that is the point of an Owner-set date — but the default should be the same
 * day the log will say it was.
 */
export function todayInUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

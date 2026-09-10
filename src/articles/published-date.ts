/**
 * When an Article was last published, as a reader sees it (issue #31).
 *
 * One helper for every surface that shows it — the Articles list and the
 * Article's own page — so the two cannot drift into different formats for the
 * same day.
 */

/**
 * Fixed, not the reader's own.
 *
 * An Article is published once, so it has one date. Formatted in the reader's
 * locale it would read `01/08/2026` in London and `8/1/2026` in New York, and
 * resolved in the reader's time zone a late-evening publish would land on two
 * different days depending on where it was read. Both are the same bug: a fact
 * about the Article turning into a fact about the reader.
 *
 * `en-GB` long form — "1 August 2026" — because the month is spelled out, so
 * there is no digit either side of the Atlantic to misread.
 */
const READS_AS = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The day `publishedAt` names, or null if it names none.
 *
 * Null covers both cases a caller has to render as nothing: a draft, which has
 * no publish to date, and a stamp that will not parse. The second is the
 * boundary where the column stops being trusted — it arrives as a string from
 * Postgres, and "Invalid Date" on the page is worse than no date at all.
 */
export function publishedOn(publishedAt: string | null): string | null {
  if (publishedAt === null) return null;

  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return null;

  return READS_AS.format(published);
}

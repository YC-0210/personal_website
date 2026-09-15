"use client";

/**
 * The Ledger — the Daylog feed, chosen by the Owner from the ADR-0004 round on
 * issue #35 (Ledger / Stack / Spine).
 *
 * The bet it makes: a work log is re-read far more often than it is written to,
 * and finding *the day you fixed the RLS join* matters more than reading that
 * day in full. So it is built to be scanned:
 *
 * - Dates are a fixed 92px column in tabular figures, so they line up as data
 *   rather than sitting in the prose. `shortDay` pads them and spells the
 *   months itself for exactly this reason.
 * - No cards. One continuous hairline rule, each day a flush row — cards would
 *   spend the width on borders and gaps that the column needs.
 * - Entries clamp to two lines.
 * - Years are marked, and stick.
 *
 * What changed under ADR-0012: the row used to open *in place*, and the
 * two-line clamp was an accepted cost recorded here so nobody would "fix" it.
 * The clamp stays — it is what makes the column scannable — but it is no longer
 * a cost, because the whole row is now a link to the day's own page. Scanning
 * and reading are different jobs, and this surface only has to do the first one
 * well.
 */

import Link from "next/link";

import { DraftBadge } from "@/components/draft-badge";
import { excerptOf } from "@/articles/article-body";
import type { DaylogEntry } from "@/projects/domain";
import { longDay, shortDay } from "@/projects/daylog-date";

export interface DaylogLedgerProps {
  projectId: string;
  entries: DaylogEntry[];
  /** The Owner's controls, per row. A Visitor passes nothing and sees none. */
  controlsFor?: (entry: DaylogEntry) => React.ReactNode;
}

export function DaylogLedger({
  projectId,
  entries,
  controlsFor,
}: DaylogLedgerProps) {
  if (entries.length === 0) {
    return (
      <p className="text-ink-subtle mt-8 text-sm">Nothing logged here yet.</p>
    );
  }

  /*
   * Where each year starts, worked out before the render rather than during
   * it: a running variable mutated inside `map` is a value that depends on how
   * many times React chose to render, which is not a thing a feed should
   * depend on. The entries arrive newest-first, so a change of year is simply
   * a change from the row before.
   */
  const marksAYear = entries.map(
    (entry, index) =>
      index === 0 || entry.date.slice(0, 4) !== entries[index - 1].date.slice(0, 4),
  );

  return (
    <div className="border-hairline mt-8 border-t">
      {entries.map((entry, index) => {
        return (
          <div key={entry.id}>
            {marksAYear[index] && (
              <p className="border-hairline bg-canvas text-ink-tertiary sticky top-0 z-10 border-b py-2.5 font-mono text-[11px] tracking-[1px]">
                {entry.date.slice(0, 4)}
              </p>
            )}
            <LedgerRow
              projectId={projectId}
              entry={entry}
              controls={controlsFor?.(entry)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Wide enough to clear the 92px date column and the 20px gap beside it. */
const PAST_THE_DATE_COLUMN = "md:pl-[112px]";

function LedgerRow({
  projectId,
  entry,
  controls,
}: {
  projectId: string;
  entry: DaylogEntry;
  controls: React.ReactNode;
}) {
  return (
    <div className="border-hairline hover:bg-surface-1/60 border-b">
      {/*
        The whole row is the link, not a control at the end of it. A row that
        reads as one thing should be clickable as one thing — and the Owner's
        controls sit *outside* it, because a button inside an anchor is neither
        valid nor clickable in the way either of them promises.

        The accessible name is the day spelled out: "20 Aug" is the right label
        for a column you are scanning with your eyes and the wrong one for a
        link read out on its own.
      */}
      <Link
        href={`/projects/${projectId}/log/${entry.id}`}
        aria-label={longDay(entry.date) ?? entry.date}
        className="group grid grid-cols-1 gap-x-5 py-3.5 md:grid-cols-[92px_1fr]"
      >
        <p className="text-ink-tertiary group-hover:text-ink-subtle pt-0.5 font-mono text-xs tabular-nums">
          {/* A stored day that will not parse reads as nothing rather than as
              "Invalid Date" — the row is still the row. */}
          {shortDay(entry.date) ?? "—"}
        </p>

        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            {entry.publishedAt === null && (
              <p className="mb-1.5">
                <DraftBadge />
              </p>
            )}

            <p className="text-ink-muted line-clamp-2 text-[14.5px] leading-relaxed">
              {excerptOf(entry.body)}
            </p>
          </div>

          {/*
            The one mark that says the row goes somewhere. It is always drawn,
            not revealed on hover: a phone has no hover, and the affordance a
            reader cannot see is the affordance they do not use — which is how
            the disclosure toggle this replaced went unnoticed.
          */}
          <span
            aria-hidden
            className="text-ink-tertiary group-hover:text-primary-hover shrink-0 pt-0.5 text-xs"
          >
            →
          </span>
        </div>
      </Link>

      {controls && (
        <div
          className={`flex flex-wrap items-center gap-3 pb-3.5 text-xs ${PAST_THE_DATE_COLUMN}`}
        >
          {controls}
        </div>
      )}
    </div>
  );
}

/** The one row the Owner gets that a Visitor does not: a way into the editor. */
export function EditEntryLink({
  projectId,
  entryId,
}: {
  projectId: string;
  entryId: string;
}) {
  return (
    <Link
      href={`/projects/${projectId}/log/${entryId}/edit`}
      className="text-ink-tertiary hover:text-ink font-medium"
    >
      Edit
    </Link>
  );
}

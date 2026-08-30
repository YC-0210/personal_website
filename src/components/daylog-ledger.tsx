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
 * - Entries clamp to two lines and open in place.
 * - Years are marked, and stick.
 *
 * The accepted cost, recorded here so nobody "fixes" it later: **a long day is
 * a two-line stub until it is opened.** That is the direction, not an oversight.
 */

import Link from "next/link";
import { useState } from "react";

import { ArticleBodyView } from "@/components/article-body-view";
import { DraftBadge } from "@/components/draft-badge";
import { excerptOf } from "@/articles/article-body";
import type { DaylogEntry } from "@/projects/domain";
import { shortDay } from "@/projects/daylog-date";

export interface DaylogLedgerProps {
  entries: DaylogEntry[];
  /** The Owner's controls, per row. A Visitor passes nothing and sees none. */
  controlsFor?: (entry: DaylogEntry) => React.ReactNode;
}

export function DaylogLedger({ entries, controlsFor }: DaylogLedgerProps) {
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
            <LedgerRow entry={entry} controls={controlsFor?.(entry)} />
          </div>
        );
      })}
    </div>
  );
}

function LedgerRow({
  entry,
  controls,
}: {
  entry: DaylogEntry;
  controls: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  /*
   * Whether there is anything behind the clamp. Asked of the text rather than
   * measured in the DOM: a row that offers "Open" and then shows the same two
   * lines is worse than one that never offered it.
   */
  const excerpt = excerptOf(entry.body);
  const hasMore = excerpt.length > 120 || (entry.body.content?.length ?? 0) > 1;

  return (
    <div className="border-hairline hover:bg-surface-1/60 grid grid-cols-1 gap-x-5 border-b py-3.5 md:grid-cols-[92px_1fr]">
      <p className="text-ink-tertiary pt-0.5 font-mono text-xs tabular-nums">
        {/* A stored day that will not parse reads as nothing rather than as
            "Invalid Date" — the row is still the row. */}
        {shortDay(entry.date) ?? "—"}
      </p>

      <div className="min-w-0">
        {entry.publishedAt === null && (
          <p className="mb-1.5">
            <DraftBadge />
          </p>
        )}

        {open ? (
          <ArticleBodyView body={entry.body} />
        ) : (
          <p className="text-ink-muted line-clamp-2 text-[14.5px] leading-relaxed">
            {excerpt}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="text-ink-tertiary hover:text-primary-hover font-medium"
            >
              {open ? "Close" : "Open"}
            </button>
          )}
          {controls}
        </div>
      </div>
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

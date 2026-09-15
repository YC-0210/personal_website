"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArticleBodyView } from "@/components/article-body-view";
import { DraftBadge } from "@/components/draft-badge";
import { longDay } from "@/projects/daylog-date";
import type { DaylogEntry } from "@/projects/domain";
import { getProjectStore, useProjects } from "@/projects/use-projects";

/**
 * One day of a Daylog, read in full (ADR-0012).
 *
 * Deliberately the Article page's shape rather than a Daylog-specific one: a
 * heading, a date, the body, and a way on. What a reader is doing here is
 * reading, and the Ledger's scanning apparatus — the fixed date column, the
 * clamp, the year rules — is machinery for the *other* job. The one difference
 * is structural rather than stylistic: a Daylog Entry has no title, so the day
 * stands where an Article's title stands (#35, decision 11).
 *
 * The way on is the day before and the day after rather than "back to the
 * list", because a Daylog is read in sequence. Both come from the store, which
 * means a Visitor is never offered a link into one of the Owner's drafts.
 */
export default function DaylogEntryPage() {
  const { status, isEditMode, error } = useProjects();
  const params = useParams<{ id: string; entryId: string }>();
  const store = getProjectStore();

  const entry = store.getEntry(params.entryId);
  const project = store.getProject(params.id);

  if (status === "idle" || status === "loading") {
    return <Shell projectId={params.id}>Loading.</Shell>;
  }

  if (status === "error") {
    return (
      <Shell projectId={params.id} role="alert">
        The day could not be loaded. {error}
      </Shell>
    );
  }

  /*
   * Covers all of "no such day", "not yours to read" and "the id belongs to
   * another Project's log" with the same sentence. The store has already
   * applied the read rule; saying which of the three it was would confirm a
   * draft exists, which is the thing ADR-0008 is for.
   */
  if (!entry || !project || entry.projectId !== params.id) {
    return <Shell projectId={params.id}>There is no day here.</Shell>;
  }

  const { earlier, later } = store.neighbouringDays(entry.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/projects/${project.id}`}
        className="text-ink-subtle hover:text-ink text-sm font-medium"
      >
        ← {project.name}
      </Link>

      <article className="mt-6">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          DAYLOG
        </p>
        {/*
          The day *is* the heading. The formatted form is not parseable, so the
          stored `YYYY-MM-DD` rides along in `dateTime` where a machine can
          still read it — the same arrangement an Article's publish date has.
        */}
        <h1 className="text-ink mt-2 text-[28px] leading-[1.15] font-semibold tracking-[-0.6px] text-balance">
          <time dateTime={entry.date}>{longDay(entry.date) ?? entry.date}</time>
        </h1>

        {/* Only the Owner can be here to see this: a draft day is refused to a
            Visitor by RLS long before the page renders. */}
        {entry.publishedAt === null && (
          <p className="mt-3 flex flex-wrap items-center gap-3">
            <DraftBadge />
            {isEditMode && (
              <Link
                href={`/projects/${project.id}/log/${entry.id}/edit`}
                className="text-ink-subtle hover:text-primary-hover text-sm font-medium"
              >
                Keep writing →
              </Link>
            )}
          </p>
        )}

        {entry.publishedAt !== null && isEditMode && (
          <p className="mt-3">
            <Link
              href={`/projects/${project.id}/log/${entry.id}/edit`}
              className="text-ink-subtle hover:text-primary-hover text-sm font-medium"
            >
              Revise this day →
            </Link>
          </p>
        )}

        {/* Rendered from the stored document — no HTML string in between. */}
        <ArticleBodyView body={entry.body} className="mt-6" />
      </article>

      {(earlier || later) && (
        <nav
          aria-label="The days either side of this one"
          className="border-hairline mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2"
        >
          <NeighbourLink projectId={project.id} entry={earlier} side="earlier" />
          <NeighbourLink projectId={project.id} entry={later} side="later" />
        </nav>
      )}
    </main>
  );
}

/**
 * One of the two ways on. Renders an empty cell rather than nothing when there
 * is no day on that side, so the later day stays on the right at the end of a
 * log instead of sliding under the earlier one's column.
 */
function NeighbourLink({
  projectId,
  entry,
  side,
}: {
  projectId: string;
  entry: DaylogEntry | null;
  side: "earlier" | "later";
}) {
  const isEarlier = side === "earlier";

  if (!entry) return <span className="hidden sm:block" />;

  return (
    <Link
      href={`/projects/${projectId}/log/${entry.id}`}
      className={`border-hairline bg-surface-1 hover:bg-surface-2 group flex flex-col gap-1 rounded-lg border px-4 py-3 ${
        isEarlier ? "" : "sm:col-start-2 sm:items-end sm:text-right"
      }`}
    >
      <span className="text-ink-tertiary text-xs">
        {isEarlier ? "← Earlier" : "Later →"}
      </span>
      <span className="text-ink group-hover:text-primary-hover text-sm font-medium">
        {longDay(entry.date) ?? entry.date}
      </span>
    </Link>
  );
}

function Shell({
  children,
  projectId,
  role,
}: {
  children: React.ReactNode;
  projectId: string;
  role?: "alert";
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p role={role} className="text-ink-subtle text-sm">
        {children}
      </p>
      <p className="mt-3">
        <Link
          href={`/projects/${projectId}`}
          className="text-ink-tertiary hover:text-ink text-[13px] font-medium"
        >
          ← The Daylog
        </Link>
      </p>
    </main>
  );
}

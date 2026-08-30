"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { ArticleBody } from "@/articles/domain";
import { WritingSurface } from "@/components/writing-surface";
import { longDay } from "@/projects/daylog-date";
import type { DaylogEntry } from "@/projects/domain";
import { getProjectStore, useProjects } from "@/projects/use-projects";

/** How long the Owner has to stop typing before a save goes out. */
const AUTOSAVE_AFTER_MS = 900;

/** Matches Tailwind's `lg`, which is where the rail stops fitting beside the column. */
const DESKTOP = "(min-width: 1024px)";

/**
 * Whether there is room to write — the same question `/articles/<id>/edit`
 * asks, and for the same reason. Hiding the surface in CSS still *mounts* it:
 * Tiptap initialises and a contenteditable sits in the DOM behind a curtain.
 * ADR-0009 says the editor does not open at all.
 */
function useHasRoomToWrite(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

type SaveState =
  | { kind: "clean" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "failed"; why: string };

/**
 * Writing one day of a Daylog.
 *
 * The same surface an Article gets, with the title slot filled by the day
 * rather than by a name: a Daylog Entry has no title, because the date is its
 * heading (#35, decision 11).
 *
 * Reusing the surface means **inheriting ADR-0009**: writing is desktop-only.
 * That is a sharper constraint on a *daily* log than it was on Articles, and it
 * was accepted knowingly — if it bites, ADR-0009 is the one to supersede, not
 * this page to special-case.
 */
export default function EditDaylogEntryPage() {
  const { status, isEditMode, error } = useProjects();
  const params = useParams<{ id: string; entryId: string }>();
  const store = getProjectStore();

  const entry = store
    .entries(params.id)
    .find((each) => each.id === params.entryId);

  if (status === "idle" || status === "loading") {
    return <Shell>Loading.</Shell>;
  }

  if (status === "error") {
    return <Shell role="alert">The Daylog could not be loaded. {error}</Shell>;
  }

  if (!isEditMode) {
    return (
      <Shell>
        The Daylog is the Owner&rsquo;s to write. <Back id={params.id} />
      </Shell>
    );
  }

  if (!entry) {
    return (
      <Shell>
        There is no day here to write. <Back id={params.id} />
      </Shell>
    );
  }

  // Keyed on the id so opening a different day remounts the workspace rather
  // than reconciling one document into another's editor.
  return <Workspace key={entry.id} entry={entry} />;
}

function Workspace({ entry }: { entry: DaylogEntry }) {
  const router = useRouter();
  const store = getProjectStore();

  const [date, setDate] = useState(entry.date);
  const [body, setBody] = useState<ArticleBody>(entry.body);
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRoomToWrite = useHasRoomToWrite();

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function queueSave(next: { date: string; body: ArticleBody }) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSave({ kind: "saving" });
      void store
        // `editEntry`, never `publishEntry`. This is the autosave path, and it
        // cannot change whether the day is published in either direction —
        // that invariant is ADR-0008's, and it is held in the store.
        .editEntry(entry.id, { date: next.date, body: next.body })
        .then(() =>
          setSave({
            kind: "saved",
            at: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
        )
        .catch((cause: unknown) =>
          setSave({
            kind: "failed",
            why: cause instanceof Error ? cause.message : String(cause),
          }),
        );
    }, AUTOSAVE_AFTER_MS);
  }

  function publish() {
    void store
      .publishEntry(entry.id)
      .then(() => router.push(`/projects/${entry.projectId}`))
      .catch((cause: unknown) =>
        setSave({
          kind: "failed",
          why: cause instanceof Error ? cause.message : String(cause),
        }),
      );
  }

  const isDraft = entry.publishedAt === null;

  if (!hasRoomToWrite) {
    return (
      <main className="bg-canvas min-h-dvh">
        <div className="mx-auto max-w-md px-6 py-16">
          <h1 className="text-ink text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
            Writing is desktop-only
          </h1>
          <p className="text-ink-subtle mt-3 text-sm leading-relaxed">
            The toolbar here works off text selection, which fights your
            phone&rsquo;s own Copy/Paste menu, and the keyboard takes half the
            screen. This is the same deliberate exception the Articles carry
            (ADR-0009), and it bites harder on a daily log — but a broken editor
            would be worse than an honest one that does not open.
          </p>
          <p className="text-ink-subtle mt-3 text-sm leading-relaxed">
            You can still publish {longDay(entry.date) ?? "this day"} if it is
            ready.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${entry.projectId}`}
              className="border-hairline text-ink hover:bg-surface-2 rounded-md border px-3.5 py-2 text-sm font-medium"
            >
              The Daylog
            </Link>
            {isDraft && (
              <button
                type="button"
                onClick={publish}
                className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-2 text-sm font-medium"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-canvas min-h-dvh">
      <WritingSurface
        body={body}
        onBodyChange={(next) => {
          setBody(next);
          queueSave({ date, body: next });
        }}
        back={<Back id={entry.projectId} />}
        heading={
          <>
            <label
              htmlFor="entry-date"
              className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]"
            >
              DAY
            </label>
            {/*
              A date field rather than a title field. The day is the heading, and
              it is the Owner's to set — you write up Monday's session on Tuesday
              morning, and a stamp you cannot change makes the log lie.
            */}
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                queueSave({ date: event.target.value, body });
              }}
              className="text-ink mt-1.5 block w-full bg-transparent text-[26px] leading-[1.25] font-medium tracking-[-0.5px] focus:outline-none"
            />
            <p className="text-ink-tertiary mt-1 text-xs">
              {longDay(date) ?? "Not a day this log can file anything under."}
            </p>
          </>
        }
        rail={
          <section>
            <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
              STATE
            </p>
            <p className="mt-2 flex items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isDraft ? "bg-primary-hover" : "bg-ink-subtle"
                }`}
              />
              <span className="text-ink text-sm font-medium">
                {isDraft ? "Draft" : "Published"}
              </span>
            </p>
            <p className="text-ink-subtle mt-2 text-xs leading-relaxed">
              {save.kind === "saving"
                ? "Saving…"
                : save.kind === "saved"
                  ? `Last saved ${save.at}.`
                  : save.kind === "failed"
                    ? `Not saved — ${save.why}`
                    : "No changes since it was opened."}
              {isDraft && " Only you can read this."}
            </p>
            {isDraft && (
              <>
                <button
                  type="button"
                  onClick={publish}
                  className="bg-primary text-on-primary hover:bg-primary-hover mt-4 w-full rounded-md px-3.5 py-2 text-sm font-medium"
                >
                  Publish
                </button>
                <p className="text-ink-tertiary mt-3 text-xs leading-relaxed">
                  Publishing the first day in a Project is also what makes the
                  Project itself public.
                </p>
              </>
            )}
          </section>
        }
      />
    </main>
  );
}

/** Leaving lands on the Project, from either entry point. */
function Back({ id }: { id: string }) {
  return (
    <Link
      href={`/projects/${id}`}
      className="text-ink-tertiary hover:text-ink text-[13px] font-medium"
    >
      ← The Daylog
    </Link>
  );
}

function Shell({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "alert";
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p role={role} className="text-ink-subtle text-sm">
        {children}
      </p>
    </main>
  );
}

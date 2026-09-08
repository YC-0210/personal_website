"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DraftBadge } from "@/components/draft-badge";
import { longDay } from "@/projects/daylog-date";
import { getProjectStore, useProjects } from "@/projects/use-projects";

/**
 * The Projects list.
 *
 * Ordered by the day each was last logged, newest first, with work that has
 * nothing published yet at the top — it has no date to sort by, and that
 * absence is information: it is what the Owner is actually working on (#35,
 * decisions 8 and 9). A Visitor never sees one of those, so their list is
 * simply dated, newest first.
 *
 * Every surface, hairline, radius and step of type here comes from DESIGN.md
 * and mirrors `/articles`, so ADR-0004's prototype round does not apply to this
 * page. It applied to the Daylog feed, and that round chose the Ledger.
 */
export default function ProjectsPage() {
  const { status, isEditMode, error, writeError } = useProjects();
  const store = getProjectStore();
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const projects = store.projects();
  const trashCount = store.trash().length;

  async function start() {
    try {
      const id = await store.addProject({ name, description });
      setStarting(false);
      setName("");
      setDescription("");
      router.push(`/projects/${id}`);
    } catch {
      // `writeError` carries the reason; the form stays open and filled in.
    }
  }

  async function handleDelete(projectId: string) {
    try {
      await store.deleteProject(projectId);
      setDeletingId(null);
    } catch {
      // `writeError` carries the reason; the list stays as it was.
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
            WORK
          </p>
          <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
            Projects
          </h1>
          <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
            What I&rsquo;m building, and the daily record of building it. Rawer
            than the Articles, on purpose.
          </p>
        </div>
        <Link
          href="/"
          className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          Sphere
        </Link>
      </div>

      {isEditMode && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStarting(!starting)}
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium"
          >
            Start a Project
          </button>
          <Link
            href="/projects/trash"
            className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Trash{trashCount > 0 ? ` · ${trashCount}` : ""}
          </Link>
        </div>
      )}

      {isEditMode && starting && (
        <div className="border-hairline bg-surface-1 mt-4 rounded-lg border p-4">
          <label
            htmlFor="project-name"
            className="text-ink-subtle mb-1 block text-xs"
          >
            Name
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
          />
          <label
            htmlFor="project-description"
            className="text-ink-subtle mb-1 block text-xs"
          >
            Description
          </label>
          <textarea
            id="project-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-4 w-full resize-none rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStarting(false)}
              className="text-ink rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {writeError && (
        <p role="alert" className="text-ink-muted mt-4 text-xs">
          {writeError}
        </p>
      )}

      {(status === "idle" || status === "loading") && (
        <p className="text-ink-subtle mt-8 text-sm">Loading.</p>
      )}

      {status === "error" && (
        <p role="alert" className="text-ink-muted mt-8 text-sm">
          The Projects could not be loaded. {error}
        </p>
      )}

      {status === "ready" && projects.length === 0 && (
        <p className="text-ink-subtle mt-8 text-sm">Nothing started yet.</p>
      )}

      <ul className="mt-8 flex flex-col">
        {projects.map((project) => {
          const lastLogged = store.lastLoggedOn(project.id);

          return (
            <li key={project.id} className="border-hairline border-t py-4">
              <Link href={`/projects/${project.id}`} className="group block">
                <h2 className="text-ink group-hover:text-primary-hover flex flex-wrap items-center gap-2 text-lg font-medium tracking-[-0.01em]">
                  {project.name}
                  {/* Only ever rendered for the Owner — a Visitor's list cannot
                      contain a Project with nothing published in it. */}
                  {lastLogged === null && <DraftBadge />}
                </h2>
                {project.description && (
                  <p className="text-ink-subtle mt-1 line-clamp-2 text-sm leading-relaxed">
                    {project.description}
                  </p>
                )}
                <p className="text-ink-tertiary mt-1.5 font-mono text-xs tabular-nums">
                  {lastLogged === null
                    ? "Nothing logged in public yet"
                    : `Last logged ${longDay(lastLogged) ?? lastLogged}`}
                </p>
              </Link>

              {isEditMode && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {deletingId === project.id ? (
                    <>
                      <span className="text-ink-subtle">
                        Move &ldquo;{project.name}&rdquo; and its Daylog to the
                        Trash?
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="text-ink font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(project.id)}
                        className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 font-medium"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(project.id)}
                      className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

"use client";

import Link from "next/link";

import { getProjectStore, useProjects } from "@/projects/use-projects";

/**
 * The Trash: Projects the Owner has deleted.
 *
 * Restore is one click, because it undoes something — and it brings the whole
 * Daylog back with it, since the log was never deleted, only made unreachable
 * with its Project.
 *
 * There is deliberately no Permanently Delete here, and no Trash for a single
 * day. A Project is months of logged work; a day is deleted outright from the
 * Ledger behind a two-step confirm (#35, decision 13). Those are the two
 * decisions, and this page is the half that protects the larger thing.
 */
export default function ProjectTrashPage() {
  const { status, isEditMode, writeError } = useProjects();
  const store = getProjectStore();

  const trashed = store.trash();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/projects"
        className="text-ink-subtle hover:text-ink text-sm font-medium"
      >
        ← Projects
      </Link>

      <h1 className="text-ink mt-4 text-[28px] font-semibold tracking-[-0.6px]">
        Trash
      </h1>

      {writeError && (
        <p role="alert" className="text-ink-muted mt-4 text-xs">
          {writeError}
        </p>
      )}

      {(status === "idle" || status === "loading") && (
        <p className="text-ink-subtle mt-8 text-sm">Loading.</p>
      )}

      {status === "ready" && !isEditMode && (
        <p className="text-ink-subtle mt-8 text-sm">
          The Trash is the Owner&rsquo;s.
        </p>
      )}

      {status === "ready" && isEditMode && trashed.length === 0 && (
        <p className="text-ink-subtle mt-8 text-sm">Nothing deleted.</p>
      )}

      {isEditMode && (
        <ul className="mt-8 flex flex-col">
          {trashed.map((project) => (
            <li key={project.id} className="border-hairline border-t py-4">
              <h2 className="text-ink text-lg font-medium tracking-[-0.01em]">
                {project.name}
              </h2>
              <p className="text-ink-subtle mt-1 text-sm leading-relaxed">
                {project.description || "No description."}
              </p>
              <p className="text-ink-tertiary mt-1 text-xs">
                {store.entries(project.id).length} days logged, waiting with it.
              </p>
              <button
                type="button"
                onClick={() => void store.restoreProject(project.id)}
                className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink mt-3 rounded-md border px-2.5 py-1 text-xs font-medium"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

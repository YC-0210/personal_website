"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { EMPTY_BODY } from "@/articles/article-body";
import { DaylogLedger, EditEntryLink } from "@/components/daylog-ledger";
import { longDay, todayInUtc } from "@/projects/daylog-date";
import type { DaylogEntry } from "@/projects/domain";
import { getProjectStore, useProjects } from "@/projects/use-projects";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * One Project and its Daylog.
 *
 * The feed is the Ledger — the ADR-0004 round on #35 chose it over the Stack
 * and the Spine. The bond controls live here rather than in the Atom's Dossier
 * (decision 14): a Project is bonded once, when it starts, and the Dossier's
 * job is to list, not to manage.
 */
export default function ProjectPage() {
  const { status, isEditMode, error, writeError } = useProjects();
  // The Sphere is loaded for the Atom labels alone: a Bonding carries an Atom
  // id, and only the Sphere knows what that Atom is called (ADR-0007).
  useSphere();
  const params = useParams<{ id: string }>();
  const store = getProjectStore();
  const sphere = getSphereStore();
  const router = useRouter();

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [bonding, setBonding] = useState(false);
  const [atomId, setAtomId] = useState("");
  const [bondName, setBondName] = useState("");
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);

  const project = store.projects().find((each) => each.id === params.id);
  const entries = project ? store.entries(project.id) : [];

  if (status === "idle" || status === "loading") {
    return <Shell>Loading.</Shell>;
  }

  if (status === "error") {
    return <Shell role="alert">The Project could not be loaded. {error}</Shell>;
  }

  if (!project) {
    // Covers both "no such Project" and "not yours to read": a Project with
    // nothing published is refused to a Visitor by RLS, and this page does not
    // distinguish the two, because doing so would confirm it exists.
    return (
      <Shell>
        There is no Project here. <Back />
      </Shell>
    );
  }

  const bonded = store
    .bondingsForProject(project.id)
    .map((each) => ({ bonding: each, atom: sphere.getAtom(each.atomId) }));

  const lastLogged = store.lastLoggedOn(project.id);

  async function logToday() {
    if (!project) return;
    try {
      const id = await store.addEntry(project.id, {
        date: todayInUtc(),
        body: EMPTY_BODY,
      });
      router.push(`/projects/${project.id}/log/${id}/edit`);
    } catch {
      // `writeError` carries the reason; the page stays as it was.
    }
  }

  function startRenaming() {
    if (!project) return;
    setDraftName(project.name);
    setDraftDescription(project.description);
    setRenaming(true);
  }

  async function rename() {
    if (!project) return;
    try {
      await store.editProject(project.id, {
        name: draftName,
        description: draftDescription,
      });
      setRenaming(false);
    } catch {
      // Left open, with the reason shown, so the Owner can fix it.
    }
  }

  async function bond() {
    if (!project) return;
    try {
      // No Name required — a Project's Bonding may carry one or not (#35,
      // decision 5). A blank one is stored as none.
      await store.addBonding({
        projectId: project.id,
        atomId,
        name: bondName.trim() === "" ? null : bondName.trim(),
      });
      setBonding(false);
      setAtomId("");
      setBondName("");
    } catch {
      // Left open, with the reason shown, so the Owner can fix it.
    }
  }

  async function destroyEntry(entryId: string) {
    try {
      await store.destroyEntry(entryId);
      setDeletingEntry(null);
    } catch {
      // `writeError` carries the reason; the day stays where it was.
    }
  }

  const atoms = sphere.getState().atoms;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
            PROJECT
          </p>
          <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
              {project.description}
            </p>
          )}
          <p className="text-ink-tertiary mt-2 font-mono text-xs tabular-nums">
            {lastLogged === null
              ? "Nothing logged in public yet"
              : `Last logged ${longDay(lastLogged) ?? lastLogged}`}
          </p>
        </div>
        <Link
          href="/projects"
          className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          Projects
        </Link>
      </div>

      {bonded.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {bonded.map(({ bonding: each, atom }) => (
            <span
              key={each.id}
              className="border-hairline bg-surface-1 text-ink-subtle inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs"
            >
              <span
                aria-hidden
                className="bg-primary-hover h-1.5 w-1.5 shrink-0 rounded-full"
              />
              <Link
                href={`/#atom-${each.atomId}`}
                className="hover:text-ink font-medium"
              >
                {atom?.label ?? "an Atom that has gone"}
              </Link>
              {each.name && (
                <span className="text-ink-tertiary">— {each.name}</span>
              )}
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => void store.deleteBonding(each.id)}
                  className="text-ink-tertiary hover:text-ink"
                  aria-label={`Unbond ${atom?.label ?? "this Atom"}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {isEditMode && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void logToday()}
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium"
          >
            Log today
          </button>
          <button
            type="button"
            onClick={() => setBonding(!bonding)}
            className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Bond an Atom
          </button>
          <button
            type="button"
            onClick={startRenaming}
            className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Rename
          </button>
        </div>
      )}

      {isEditMode && renaming && (
        <div className="border-hairline bg-surface-1 mt-4 rounded-lg border p-4">
          <label
            htmlFor="rename-name"
            className="text-ink-subtle mb-1 block text-xs"
          >
            Name
          </label>
          <input
            id="rename-name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
          />
          <label
            htmlFor="rename-description"
            className="text-ink-subtle mb-1 block text-xs"
          >
            Description
          </label>
          <textarea
            id="rename-description"
            rows={2}
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-4 w-full resize-none rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="text-ink rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void rename()}
              className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {isEditMode && bonding && (
        <div className="border-hairline bg-surface-1 mt-4 rounded-lg border p-4">
          <label
            htmlFor="bond-atom"
            className="text-ink-subtle mb-1 block text-xs"
          >
            Atom
          </label>
          <select
            id="bond-atom"
            value={atomId}
            onChange={(event) => setAtomId(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Choose an Atom</option>
            {atoms.map((atom) => (
              <option key={atom.id} value={atom.id}>
                {atom.label}
              </option>
            ))}
          </select>
          <label
            htmlFor="bond-name"
            className="text-ink-subtle mb-1 block text-xs"
          >
            How it feeds the work{" "}
            <span className="text-ink-tertiary">— optional</span>
          </label>
          <input
            id="bond-name"
            value={bondName}
            onChange={(event) => setBondName(event.target.value)}
            className="border-hairline bg-surface-2 text-ink mb-4 w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBonding(false)}
              className="text-ink rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={atomId === ""}
              onClick={() => void bond()}
              className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Bond
            </button>
          </div>
        </div>
      )}

      {writeError && (
        <p role="alert" className="text-ink-muted mt-4 text-xs">
          {writeError}
        </p>
      )}

      <p className="text-ink-tertiary mt-10 text-[13px] font-medium tracking-[0.4px]">
        DAYLOG · {entries.length}
      </p>

      <DaylogLedger
        entries={entries}
        controlsFor={
          isEditMode
            ? (entry: DaylogEntry) => (
                <>
                  <EditEntryLink projectId={project.id} entryId={entry.id} />
                  {deletingEntry === entry.id ? (
                    <>
                      <span className="text-ink-subtle">
                        Delete this day for good?
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(null)}
                        className="text-ink font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void destroyEntry(entry.id)}
                        className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2 py-0.5 font-medium"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingEntry(entry.id)}
                      className="text-ink-tertiary hover:text-ink font-medium"
                    >
                      Delete
                    </button>
                  )}
                </>
              )
            : undefined
        }
      />
    </main>
  );
}

function Back() {
  return (
    <Link
      href="/projects"
      className="text-ink-tertiary hover:text-ink text-[13px] font-medium"
    >
      ← The Projects
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

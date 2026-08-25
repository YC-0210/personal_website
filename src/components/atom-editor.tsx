"use client";

import { useEffect, useRef, useState } from "react";

import { toLearningState, type Atom, type AtomId } from "@/sphere/domain";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The Owner's Atom controls, and the form behind them.
 *
 * Edit Mode only ever *adds* to the page, so these sit in the opposite corner
 * from the sign-in mark and the Sphere itself is untouched. Editing and deleting
 * act on the selected Atom rather than on a list, because selection is already
 * how the Owner points at an Atom.
 *
 * Surfaces, hairlines, radii and the scarce lavender all come from DESIGN.md —
 * this is the same dialog shell the sign-in form uses.
 */
export function AtomEditor() {
  const { isEditMode, selectedAtomId, writeError } = useSphere();
  const store = getSphereStore();
  const selected = selectedAtomId ? store.getAtom(selectedAtomId) : undefined;

  const [editing, setEditing] = useState<"none" | "new" | "existing">("none");
  /**
   * The Atom a delete is pending on, rather than a bare flag — selecting a
   * different Atom then takes the confirmation away on its own.
   */
  const [deletingAtomId, setDeletingAtomId] = useState<AtomId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  const isFormOpen = editing !== "none";
  const isConfirmingDelete =
    selected !== undefined && deletingAtomId === selected.id;
  // The Atom the form is bound to, captured by which control opened it.
  const subject = editing === "existing" ? selected : undefined;

  useEffect(() => {
    if (isFormOpen) labelRef.current?.focus();
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing("none");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFormOpen]);

  if (!isEditMode) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = {
      label: String(form.get("label") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      hoursSpent: Number(form.get("hoursSpent") ?? 0),
      // Read through the same normaliser the repository uses, so a value the
      // form should never produce cannot reach the store either.
      learningState: toLearningState(form.get("learningState")),
    };

    setIsSaving(true);
    try {
      if (subject) await store.editAtom(subject.id, draft);
      else await store.addAtom(draft);
      setEditing("none");
    } catch {
      // The store has already put the reason in `writeError`; the form stays
      // open over it so the Owner doesn't lose what they typed.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(atom: Atom) {
    setIsSaving(true);
    try {
      await store.deleteAtom(atom.id);
      setDeletingAtomId(null);
    } catch {
      // Same as above — `writeError` carries it.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/*
        On mobile these ride just above the Compact Bar — the selection they
        act on is what the bar is showing.
      */}
      <div className="fixed right-4 bottom-4 z-20 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 text-sm max-md:right-3 max-md:bottom-20">
        {selected && !isConfirmingDelete && (
          <>
            <button
              type="button"
              onClick={() => setEditing("existing")}
              className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-3 py-1.5 font-medium"
            >
              Edit Atom
            </button>
            <button
              type="button"
              onClick={() => setDeletingAtomId(selected.id)}
              className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-3 py-1.5 font-medium"
            >
              Delete
            </button>
          </>
        )}

        {selected && isConfirmingDelete && (
          <div className="border-hairline bg-surface-1 flex items-center gap-2 rounded-md border px-3 py-1.5">
            <span className="text-ink-subtle text-xs">
              Delete “{selected.label}” and its Connections?
            </span>
            <button
              type="button"
              onClick={() => setDeletingAtomId(null)}
              className="text-ink text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleDelete(selected)}
              className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setEditing("new")}
          className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 font-medium"
        >
          Add Atom
        </button>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEditing("none");
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="atom-form-heading"
            onSubmit={handleSubmit}
            className="border-hairline bg-surface-1 w-full max-w-96 rounded-lg border p-6"
          >
            <h2
              id="atom-form-heading"
              className="text-ink mb-4 text-lg font-semibold tracking-tight"
            >
              {subject ? "Edit Atom" : "Add Atom"}
            </h2>

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="atom-label"
            >
              Label
            </label>
            <input
              ref={labelRef}
              id="atom-label"
              name="label"
              type="text"
              required
              defaultValue={subject?.label ?? ""}
              className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
            />

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="atom-description"
            >
              Description
            </label>
            <textarea
              id="atom-description"
              name="description"
              rows={3}
              defaultValue={subject?.description ?? ""}
              className="border-hairline bg-surface-2 text-ink mb-3 w-full resize-none rounded-md border px-3 py-2 text-sm"
            />

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="atom-hours"
            >
              Time spent (hours)
            </label>
            <input
              id="atom-hours"
              name="hoursSpent"
              type="number"
              min={0}
              step="any"
              required
              defaultValue={subject?.hoursSpent ?? 0}
              className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
            />

            {/*
              Where the Owner stands with the topic — not how much time went in.
              It colours the Atom's moons: green while it is still being worked
              through, lavender once it is done.
            */}
            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="atom-learning-state"
            >
              Learning state
            </label>
            <select
              id="atom-learning-state"
              name="learningState"
              defaultValue={subject?.learningState ?? "ongoing"}
              className="border-hairline bg-surface-2 text-ink mb-4 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="ongoing">Still learning</option>
              <option value="learned">Learned</option>
            </select>

            {writeError && (
              <p role="alert" className="text-ink-muted mb-3 text-xs">
                {writeError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing("none")}
                className="text-ink rounded-md px-3 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

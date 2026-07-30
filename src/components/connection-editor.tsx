"use client";

import { useEffect, useRef, useState } from "react";

import type { Connection } from "@/sphere/domain";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/** What the store's Strength scale allows, and a step the Owner can feel. */
const STRENGTH_STEP = 0.05;

/**
 * The Owner's Connection controls, and the form behind them.
 *
 * Connecting is a gesture rather than a picker: "Connect Atoms" arms it, and the
 * next two Atoms clicked in the Sphere become the ends. That is the same click
 * used to select an Atom, so there is nothing new to learn — the prompt in the
 * bar is the only thing that changes while it is armed.
 *
 * Existing Connections are edited from the selected Atom, which is already how
 * the Sphere lights the Connections that touch it.
 */
export function ConnectionEditor() {
  const { isEditMode, selectedAtomId, pendingConnection, writeError } =
    useSphere();
  const store = getSphereStore();

  const [editing, setEditing] = useState<Connection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const strengthRef = useRef<HTMLInputElement>(null);

  const isPairPicked =
    pendingConnection?.fromAtomId != null &&
    pendingConnection.toAtomId != null;
  // Both routes into the form: finishing the gesture, or picking one to edit.
  const isFormOpen = isPairPicked || editing !== null;

  useEffect(() => {
    if (isFormOpen) strengthRef.current?.focus();
  }, [isFormOpen]);

  if (!isEditMode) return null;

  const selectedConnections = selectedAtomId
    ? store.connectionsForAtom(selectedAtomId)
    : [];

  function closeForm() {
    setEditing(null);
    store.cancelConnection();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = {
      strength: Number(form.get("strength") ?? 0),
      description: String(form.get("description") ?? "").trim(),
    };

    setIsSaving(true);
    try {
      if (editing) {
        await store.editConnection(editing.id, { ...editing, ...details });
        setEditing(null);
      } else {
        await store.completeConnection(details);
      }
    } catch {
      // `writeError` carries the reason; the form stays open over it.
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(connection: Connection) {
    setIsSaving(true);
    try {
      await store.deleteConnection(connection.id);
    } catch {
      // Same as above.
    } finally {
      setIsSaving(false);
    }
  }

  /** The Atom at the other end of a Connection from the one selected. */
  function farAtomLabel(connection: Connection): string {
    const farId =
      connection.fromAtomId === selectedAtomId
        ? connection.toAtomId
        : connection.fromAtomId;
    return store.getAtom(farId)?.label ?? "an Atom";
  }

  return (
    <>
      {selectedConnections.length > 0 && !pendingConnection && (
        <ul className="border-hairline bg-surface-1 fixed right-4 bottom-28 w-72 max-w-[calc(100vw-2rem)] space-y-1 rounded-lg border p-2 text-xs max-md:top-28 max-md:bottom-auto">
          {selectedConnections.map((connection) => (
            <li
              key={connection.id}
              className="hover:bg-surface-2 flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <span className="text-ink flex-1 truncate">
                {farAtomLabel(connection)}
              </span>
              <span className="text-ink-tertiary tabular-nums">
                {connection.strength.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => setEditing(connection)}
                className="text-ink-subtle hover:text-ink font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleDelete(connection)}
                className="text-ink-subtle hover:text-ink font-medium disabled:opacity-60"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        Once both ends are picked the form takes over, so the prompt goes away
        rather than sitting under the dialog still asking for a second Atom.
      */}
      {/* Rides above the Atom controls; on mobile both rows hang from the top. */}
      <div className="fixed right-4 bottom-16 flex items-center gap-2 text-sm max-md:top-16 max-md:bottom-auto">
        {isPairPicked ? null : pendingConnection ? (
          <div className="border-hairline bg-surface-1 flex items-center gap-3 rounded-md border px-3 py-1.5">
            <span className="text-ink-subtle text-xs">
              {pendingConnection.fromAtomId === null
                ? "Click the first Atom."
                : "Now click the second Atom."}
            </span>
            <button
              type="button"
              onClick={() => store.cancelConnection()}
              className="text-ink text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => store.beginConnection()}
            className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-3 py-1.5 font-medium"
          >
            Connect Atoms
          </button>
        )}
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 grid place-items-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-form-heading"
            onSubmit={handleSubmit}
            className="border-hairline bg-surface-1 w-full max-w-96 rounded-lg border p-6"
          >
            <h2
              id="connection-form-heading"
              className="text-ink mb-1 text-lg font-semibold tracking-tight"
            >
              {editing ? "Edit Connection" : "Connect Atoms"}
            </h2>
            <p className="text-ink-subtle mb-4 text-xs">
              {connectionSubtitle()}
            </p>

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="connection-strength"
            >
              Strength (0–1)
            </label>
            <input
              ref={strengthRef}
              id="connection-strength"
              name="strength"
              type="number"
              min={0}
              max={1}
              step={STRENGTH_STEP}
              required
              defaultValue={editing?.strength ?? 0.5}
              className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
            />

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="connection-description"
            >
              How they relate
            </label>
            <textarea
              id="connection-description"
              name="description"
              rows={3}
              defaultValue={editing?.description ?? ""}
              className="border-hairline bg-surface-2 text-ink mb-4 w-full resize-none rounded-md border px-3 py-2 text-sm"
            />

            {writeError && (
              <p role="alert" className="text-ink-muted mb-3 text-xs">
                {writeError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
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

  /** Names the two Atoms the form is about, so the pair is never in doubt. */
  function connectionSubtitle(): string {
    const pair = editing ?? pendingConnection;
    if (!pair?.fromAtomId || !pair.toAtomId) return "";
    const from = store.getAtom(pair.fromAtomId)?.label ?? "an Atom";
    const to = store.getAtom(pair.toAtomId)?.label ?? "an Atom";
    return `${from} and ${to}`;
  }
}

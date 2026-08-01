"use client";

import { useEffect, useState } from "react";

import type { AtomDetail } from "@/sphere/store";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The Dossier, in the form the viewport earns.
 *
 * On desktop, selecting an Atom slides a card in from the right with the
 * Atom's full detail and its Connections. On mobile the selection shows only
 * the Compact Bar — label, hours, Connection count — so the Sphere, its
 * Nameplates and its lit Connections stay visible; opening the bar takes the
 * whole screen with the connected knowledge leading (the Takeover chosen from
 * the ADR-0004 prototypes).
 *
 * Every Connection row is a route — activating one hands navigation to the
 * store, which moves the selection to the Atom at the far end; the open
 * Dossier follows it. The ✕ (or Escape) is the explicit way back out.
 *
 * All state but "is the mobile Dossier open" lives in the store; this
 * component renders `selectedDetail` and calls store operations. Surfaces,
 * hairlines, radii and type are DESIGN.md tokens throughout.
 */
export function AtomDetailPanel() {
  const { selectedAtomId } = useSphere();
  const store = getSphereStore();
  const detail = store.selectedDetail();

  // The card keeps its last contents while sliding out, so an exit reads as
  // the card leaving rather than the card emptying first. While the card is
  // open, `detail` is always the fresh copy — this only shows through during
  // the slide-out, so keying it by Atom is enough.
  const [lastDetail, setLastDetail] = useState<AtomDetail | null>(null);
  if (detail && detail.atom.id !== lastDetail?.atom.id) setLastDetail(detail);

  /**
   * Whether the mobile Dossier has taken the screen over. Survives following a
   * Connection (the Dossier stays open on the new Atom); resets when the
   * selection itself goes, so the next selection starts back at the bar.
   */
  const [isTakenOver, setIsTakenOver] = useState(false);

  const isOpen = selectedAtomId !== null && detail !== null;
  if (!isOpen && isTakenOver) setIsTakenOver(false);
  const shown = detail ?? lastDetail;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") getSphereStore().clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!shown) return null;

  const connectionRows = (
    <div className="mt-2 flex flex-col">
      {shown.connections.map(({ connection, otherAtom }) => (
        <button
          key={connection.id}
          type="button"
          onClick={() => store.selectViaConnection(connection.id)}
          className="border-hairline hover:bg-primary-hover/5 flex flex-col gap-1 border-t py-3 text-left"
        >
          <span className="text-ink-muted text-sm leading-relaxed">
            {connection.description}
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="text-ink-subtle text-xs">
              → {otherAtom.label}
            </span>
            <span
              aria-label={`Strength ${Math.round(connection.strength * 100)} of 100`}
              className="bg-hairline-strong h-0.5 w-9 flex-none overflow-hidden rounded-full"
            >
              <span
                className="bg-primary-hover block h-full"
                style={{ width: `${Math.round(connection.strength * 100)}%` }}
              />
            </span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop: the side card, exactly as before. */}
      <aside
        aria-label={`${shown.atom.label} details`}
        aria-hidden={!isOpen}
        className={`border-hairline bg-surface-1 fixed top-4 right-4 bottom-4 w-[372px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border p-6 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-md:hidden ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Close details"
          onClick={() => store.clearSelection()}
          className="text-ink-tertiary hover:text-ink absolute top-4 right-4 rounded-md p-1 text-sm leading-none"
        >
          ✕
        </button>

        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ATOM
        </p>
        <h2 className="text-ink mt-2 text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
          {shown.atom.label}
        </h2>
        <p className="bg-surface-2 text-ink-muted mt-2 inline-block rounded-full px-2 py-0.5 text-xs">
          {shown.atom.hoursSpent.toLocaleString()} hrs
        </p>
        <p className="text-ink-muted mt-4 text-sm leading-relaxed">
          {shown.atom.description}
        </p>

        <p className="text-ink-tertiary mt-6 text-[13px] font-medium tracking-[0.4px]">
          CONNECTED KNOWLEDGE · {shown.connections.length}
        </p>
        {connectionRows}
      </aside>

      {/* Mobile: the Compact Bar — the lean form that never blocks the Sphere. */}
      {isOpen && !isTakenOver && (
        <button
          type="button"
          onClick={() => setIsTakenOver(true)}
          className="border-hairline bg-surface-1 fixed right-3 bottom-3 left-3 z-20 flex items-center gap-3 rounded-lg border px-4 py-3 text-left md:hidden"
        >
          <span className="min-w-0 flex-1">
            <span className="text-ink block truncate text-sm font-medium">
              {shown.atom.label}
            </span>
            <span className="text-ink-subtle text-xs">
              {shown.atom.hoursSpent.toLocaleString()} hrs ·{" "}
              {shown.connections.length} connections
            </span>
          </span>
          <span className="text-primary-hover text-xs font-medium">
            Details ↑
          </span>
        </button>
      )}

      {/* Mobile: the Takeover Dossier, connected knowledge first. */}
      {isOpen && isTakenOver && (
        <section
          aria-label={`${shown.atom.label} details`}
          className="bg-canvas fixed inset-0 z-20 overflow-y-auto px-4 pt-4 pb-10 md:hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                ATOM
              </p>
              <h2 className="text-ink mt-1 text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
                {shown.atom.label}
              </h2>
              <p className="bg-surface-2 text-ink-muted mt-2 inline-block rounded-full px-2 py-0.5 text-xs">
                {shown.atom.hoursSpent.toLocaleString()} hrs
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTakenOver(false)}
              className="border-hairline bg-surface-1 text-ink rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              ↓ Sphere
            </button>
          </div>

          <p className="text-ink-tertiary mt-6 text-[13px] font-medium tracking-[0.4px]">
            CONNECTED KNOWLEDGE · {shown.connections.length}
          </p>
          {connectionRows}

          <p className="text-ink-tertiary mt-8 text-[13px] font-medium tracking-[0.4px]">
            ABOUT
          </p>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            {shown.atom.description}
          </p>
        </section>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

import type { AtomDetail } from "@/sphere/store";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The Dossier: selecting an Atom slides this card in from the right with the
 * Atom's full detail and its Connections. Every Connection row is a route —
 * clicking one hands navigation to the store, which moves the selection to the
 * Atom at the far end. The ✕ (or Escape) is the explicit way back out.
 *
 * All state lives in the store; this component only renders `selectedDetail`
 * and calls store operations. Surfaces, hairlines, radii and type are
 * DESIGN.md tokens throughout.
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

  const isOpen = selectedAtomId !== null && detail !== null;
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

  return (
    <aside
      aria-label={`${shown.atom.label} details`}
      aria-hidden={!isOpen}
      className={`border-hairline bg-surface-1 fixed top-4 right-4 bottom-4 w-[372px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border p-6 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-md:top-auto max-md:left-4 max-md:max-h-[52%] max-md:w-auto ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0 max-md:translate-x-0 max-md:translate-y-[calc(100%+2rem)]"
      }`}
    >
      <button
        type="button"
        aria-label="Close details"
        onClick={() => getSphereStore().clearSelection()}
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
        CONNECTIONS · {shown.connections.length}
      </p>

      <div className="mt-2 flex flex-col">
        {shown.connections.map(({ connection, otherAtom }) => (
          <button
            key={connection.id}
            type="button"
            onClick={() => getSphereStore().selectViaConnection(connection.id)}
            className="border-hairline hover:bg-primary-hover/5 flex flex-col gap-1 border-t py-3 text-left"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-ink text-sm">{otherAtom.label}</span>
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
            <span className="text-ink-subtle text-xs leading-normal">
              {connection.description}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

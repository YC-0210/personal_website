"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Atom, Connection } from "@/sphere/domain";
import { placePanel } from "@/sphere/panel-placement";
import { getScreenProjection, screenPositionOf } from "@/sphere/screen-projection";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The selected Atom's detail, set beside the Atom itself rather than in a
 * panel — the Sphere is never covered by a slab of chrome.
 *
 * Two shapes, chosen by how much room there is:
 *
 * - **Wide**: a column of plain type standing in whichever patch of the Sphere
 *   is emptiest, re-homing as the visitor orbits, tied to its Atom by a leader
 *   line. Only the links take the pointer, so a Connection visible behind the
 *   type is still clickable.
 * - **Narrow**: a 44px chip carrying just the label, hours and Connection
 *   count — small enough that there is always somewhere clear to put it, so
 *   the Sphere stays open and every Atom stays tappable. Tapping the chip
 *   raises the full detail as a sheet.
 *
 * Both were chosen by the Owner from the ADR-0004 prototypes.
 */

/** Below this the chip-and-sheet shape takes over from the column. */
const NARROW_VIEWPORT = 560;

/** Width the column is laid out at; must match the CSS below. */
const COLUMN_WIDTH = 292;

/** Per-second rate the column glides toward a new placement at. */
const GLIDE = 9;

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_VIEWPORT - 1}px)`);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return narrow;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function hoursLabel(hours: number): string {
  return `${hours.toLocaleString("en-US")} hours`;
}

/**
 * Drive the element's position from the placement search on an animation
 * frame, rather than through React — the Sphere turns at 60fps and none of
 * this is state anything else needs.
 */
function useClearSpacePlacement(
  ref: React.RefObject<HTMLDivElement | null>,
  atomId: string | null,
  enabled: boolean,
  reducedMotion: boolean,
) {
  const placement = useRef<{ key: string | null; x: number; y: number } | null>(
    null,
  );
  const leader = useRef<SVGLineElement | null>(null);

  useEffect(() => {
    placement.current = null;
  }, [atomId, enabled]);

  useEffect(() => {
    if (!enabled || !atomId) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      const element = ref.current;
      const projection = getScreenProjection();
      const anchor = screenPositionOf(atomId);
      if (!element || !anchor || projection.width === 0) return;

      const panel = {
        width: element.offsetWidth || COLUMN_WIDTH,
        height: element.offsetHeight || 240,
      };

      const goal = placePanel({
        anchor,
        panel,
        viewport: { width: projection.width, height: projection.height },
        occluders: projection.atoms.filter((atom) => atom.id !== atomId),
        current: placement.current?.key ?? null,
      });

      const settled = placement.current;
      const step = reducedMotion ? 1 : 1 - Math.exp(-delta * GLIDE);
      const x = settled ? settled.x + (goal.x - settled.x) * step : goal.x;
      const y = settled ? settled.y + (goal.y - settled.y) * step : goal.y;
      placement.current = { key: goal.key, x, y };

      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

      // Keep the column visibly tied to the Atom it belongs to; it can end up
      // some way off when the Sphere is crowded.
      const line = leader.current;
      if (line) {
        const fromX = x < anchor.x ? x + panel.width : x;
        const fromY = y + Math.min(22, panel.height / 2);
        line.setAttribute("x1", String(anchor.x));
        line.setAttribute("y1", String(anchor.y));
        line.setAttribute("x2", String(fromX));
        line.setAttribute("y2", String(fromY));
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ref, atomId, enabled, reducedMotion]);

  return leader;
}

interface DetailContentProps {
  atom: Atom;
  connections: Connection[];
  counterpartOf: (connection: Connection) => Atom | undefined;
  onFollow: (connectionId: string) => void;
}

function DetailContent({
  atom,
  connections,
  counterpartOf,
  onFollow,
}: DetailContentProps) {
  return (
    <>
      <h2 className="text-ink text-[22px] leading-tight font-medium tracking-[-0.4px] text-balance">
        {atom.label}
      </h2>
      <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
        {hoursLabel(atom.hoursSpent)} · {connections.length}{" "}
        {connections.length === 1 ? "connection" : "connections"}
      </p>
      <p className="text-ink-muted mt-2 text-[13px] leading-relaxed">
        {atom.description}
      </p>

      {connections.length > 0 && (
        <ul className="border-hairline mt-4 list-none border-t p-0">
          {connections.map((connection) => {
            const counterpart = counterpartOf(connection);
            return (
              <li key={connection.id} className="mt-2">
                <button
                  type="button"
                  onClick={() => onFollow(connection.id)}
                  className="group text-ink pointer-events-auto flex min-h-11 items-center gap-2 text-left text-sm font-medium tracking-[-0.1px] sm:min-h-0"
                >
                  <span className="text-ink-tertiary text-xs">→</span>
                  <span className="group-hover:text-primary-hover group-hover:border-primary-hover border-b border-transparent transition-colors">
                    {counterpart?.label ?? "Unknown Atom"}
                  </span>
                </button>
                <p className="text-ink-tertiary -mt-1 pb-1 text-xs leading-snug sm:mt-0.5">
                  {connection.description}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function SphereDetail() {
  const { selectedAtomId, atoms } = useSphere();
  const store = getSphereStore();
  const isNarrow = useIsNarrow();
  const reducedMotion = useReducedMotion();

  // Which Atom the sheet was raised for, rather than a bare open/closed flag:
  // moving to another Atom then collapses it on its own, with no effect
  // chasing the selection.
  const [sheetForAtomId, setSheetForAtomId] = useState<string | null>(null);
  const isSheetOpen =
    sheetForAtomId !== null && sheetForAtomId === selectedAtomId;
  const closeSheet = () => setSheetForAtomId(null);

  const columnRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  const atom = selectedAtomId
    ? atoms.find((candidate) => candidate.id === selectedAtomId)
    : undefined;
  const atomConnections = selectedAtomId
    ? store.connectionsForAtom(selectedAtomId)
    : [];

  const counterpartOf = useCallback(
    (connection: Connection) => {
      const otherId =
        connection.fromAtomId === selectedAtomId
          ? connection.toAtomId
          : connection.fromAtomId;
      return atoms.find((candidate) => candidate.id === otherId);
    },
    [atoms, selectedAtomId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isSheetOpen) closeSheet();
      else store.clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSheetOpen, store]);

  const placedRef = isNarrow ? chipRef : columnRef;
  const leaderRef = useClearSpacePlacement(
    placedRef,
    atom ? atom.id : null,
    Boolean(atom) && !(isNarrow && isSheetOpen),
    reducedMotion,
  );

  function follow(connectionId: string) {
    closeSheet();
    store.followConnection(connectionId);
  }

  if (!atom) return null;

  const leader = (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <line
        ref={leaderRef}
        stroke="#828fff"
        strokeOpacity="0.3"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
    </svg>
  );

  if (isNarrow) {
    return (
      <>
        {!isSheetOpen && leader}

        {/*
          The chip: everything you need to know which Atom is selected, in a
          44px tap target that leaves the Sphere open behind it.
        */}
        <div
          ref={chipRef}
          hidden={isSheetOpen}
          className="pointer-events-none absolute top-0 left-0 will-change-transform"
        >
          <button
            type="button"
            onClick={() => setSheetForAtomId(atom.id)}
            aria-expanded={isSheetOpen}
            className="border-hairline-strong text-ink pointer-events-auto flex h-11 max-w-[calc(100vw-28px)] items-center gap-2.5 rounded-full border bg-[color-mix(in_srgb,var(--color-surface-2)_92%,transparent)] px-3.5 backdrop-blur-md"
          >
            <span className="truncate text-sm font-semibold tracking-[-0.2px]">
              {atom.label}
            </span>
            <span className="text-ink-tertiary text-xs tabular-nums">
              {atom.hoursSpent.toLocaleString("en-US")}h
            </span>
            <span className="bg-primary text-on-primary shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold">
              {atomConnections.length}
            </span>
          </button>
        </div>

        {isSheetOpen && (
          <div
            className="pointer-events-auto absolute inset-0"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeSheet();
            }}
          >
            <div
              role="dialog"
              aria-label={`${atom.label} detail`}
              className="border-hairline bg-surface-1 absolute right-0 bottom-0 left-0 max-h-[66%] overflow-y-auto rounded-t-2xl border-t px-4.5 pt-2 pb-5"
            >
              <div className="bg-hairline-strong mx-auto mb-3 h-1 w-8 rounded-full" />
              <DetailContent
                atom={atom}
                connections={atomConnections}
                counterpartOf={counterpartOf}
                onFollow={follow}
              />
              <button
                type="button"
                onClick={() => store.clearSelection()}
                className="border-hairline text-ink hover:bg-surface-2 mt-4 min-h-11 w-full rounded-md border text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {leader}
      <div
        ref={columnRef}
        className="pointer-events-none absolute top-0 left-0 w-[292px] will-change-transform"
      >
        {/*
          A scrim rather than a card: the Sphere still shows through, but the
          type has to win against whatever the placement could not avoid.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-7 -top-6 -bottom-7 -z-0"
          style={{
            background:
              "radial-gradient(118% 96% at 24% 26%, var(--color-canvas) 0%, color-mix(in srgb, var(--color-canvas) 96%, transparent) 34%, color-mix(in srgb, var(--color-canvas) 78%, transparent) 62%, transparent 100%)",
          }}
        />
        <div className="relative z-10">
          <DetailContent
            atom={atom}
            connections={atomConnections}
            counterpartOf={counterpartOf}
            onFollow={follow}
          />
          <p className="text-ink-tertiary mt-3.5 text-[11px] tracking-wide uppercase">
            <kbd className="border-hairline-strong text-ink-subtle rounded-xs border px-1.5 py-px text-[10px]">
              Esc
            </kbd>{" "}
            or click away
          </p>
        </div>
      </div>
    </>
  );
}

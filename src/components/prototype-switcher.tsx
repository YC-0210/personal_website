"use client";

import { useCallback, useEffect, useState } from "react";



/**
 * PROTOTYPE ONLY — shared switcher bar for the hero-quote (issue #23) and
 * Rank-curve (issue #24) prototypes. Not part of the real app; drop this
 * file, its call sites in `page.tsx`, and the variant components once a
 * direction is chosen for each. See the /prototype skill.
 */

export interface PrototypeVariant {
  key: string;
  name: string;
}

function readParam(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

/** One question's worth of variant state, synced to a URL search param. */
export function usePrototypeVariant(
  paramName: string,
  variants: PrototypeVariant[],
) {
  // Always starts at the first variant so the client's first render matches
  // the server's (no `window` there) — then adopts the real URL value once
  // mounted. Reading `window.location` any earlier is exactly the case the
  // "no setState in an effect" rule carves out: there is no way to know this
  // value before hydration without a mismatch.
  const [current, setCurrent] = useState(variants[0].key);

  useEffect(() => {
    const fromUrl = readParam(paramName, variants[0].key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading window.location, unknowable before mount
    if (fromUrl !== variants[0].key) setCurrent(fromUrl);
  }, [paramName, variants]);

  const cycle = useCallback(
    (delta: number) => {
      setCurrent((prevKey) => {
        const index = Math.max(
          0,
          variants.findIndex((v) => v.key === prevKey),
        );
        const next =
          variants[(index + delta + variants.length) % variants.length].key;
        const params = new URLSearchParams(window.location.search);
        params.set(paramName, next);
        window.history.replaceState(null, "", `?${params.toString()}`);
        return next;
      });
    },
    [variants, paramName],
  );

  return { current, cycle };
}

export function PrototypeSwitcher({
  paramName,
  variants,
  current,
  cycle,
  side,
}: {
  paramName: string;
  variants: PrototypeVariant[];
  current: string;
  cycle: (delta: number) => void;
  side: "left" | "right";
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycle]);

  if (process.env.NODE_ENV === "production") return null;

  const active = variants.find((v) => v.key === current) ?? variants[0];

  return (
    <div
      className={`fixed bottom-4 ${side === "left" ? "left-4" : "right-4"} z-50 flex items-center gap-2 rounded-full border border-[#828fff] bg-black/85 px-3 py-2 font-mono text-xs text-white shadow-lg`}
    >
      <button
        type="button"
        onClick={() => cycle(-1)}
        aria-label={`Previous ${paramName}`}
        className="px-1 text-sm font-bold"
      >
        ←
      </button>
      <span className="whitespace-nowrap">
        {paramName}={active.key} — {active.name}
      </span>
      <button
        type="button"
        onClick={() => cycle(1)}
        aria-label={`Next ${paramName}`}
        className="px-1 text-sm font-bold"
      >
        →
      </button>
    </div>
  );
}

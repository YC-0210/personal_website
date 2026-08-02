"use client";

/**
 * ADR-0004 prototype switcher — throwaway. Removed before merge.
 *
 * A floating bar that flips between variants on one route via `?variant=`, so
 * the Owner can compare directions without losing their place — and so a
 * chosen direction can be linked to. Deliberately loud: it must never read as
 * part of the design being judged.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export interface ProtoVariant {
  key: string;
  name: string;
  /** One line on what makes this direction different from the other two. */
  note: string;
}

/** The variant named in the URL, defaulting to the first. */
export function useVariant(variants: ProtoVariant[]): ProtoVariant {
  const key = useSearchParams().get("variant");
  return variants.find((variant) => variant.key === key) ?? variants[0];
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function ProtoSwitcher({
  variants,
  current,
}: {
  variants: ProtoVariant[];
  current: ProtoVariant;
}) {
  const router = useRouter();
  const index = variants.indexOf(current);

  useEffect(() => {
    function go(step: number) {
      const next = variants[(index + step + variants.length) % variants.length];
      router.replace(`?variant=${next.key}`, { scroll: false });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, router, variants]);

  // A stray merge of a prototype must not be able to ship this bar to a Visitor.
  if (process.env.NODE_ENV === "production") return null;

  const step = (by: number) =>
    router.replace(
      `?variant=${variants[(index + by + variants.length) % variants.length].key}`,
      { scroll: false },
    );

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-1 rounded-full border border-white/25 bg-black/85 p-1 backdrop-blur">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => step(-1)}
        className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      >
        ←
      </button>

      <span className="min-w-0 flex-1 px-1 text-center">
        <span className="block truncate text-xs font-semibold text-white">
          {current.name}
        </span>
        <span className="block truncate text-[11px] text-white/55">
          {current.note}
        </span>
      </span>

      <button
        type="button"
        aria-label="Next variant"
        onClick={() => step(1)}
        className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      >
        →
      </button>

      <a
        href="/proto"
        className="mr-1 shrink-0 rounded-full px-2 text-[11px] text-white/50 hover:text-white"
      >
        index
      </a>
    </div>
  );
}

"use client";

import { useState } from "react";

/**
 * PROTOTYPE ONLY (issue #23) — three structurally different treatments of
 * the Charlie Munger hero quote, switchable via `?hero=`. See the
 * /prototype skill; drop this file and its call site in `page.tsx` once the
 * Owner picks a direction.
 */

const QUOTE =
  "To The Man With A Hammer, Every Problem Tends To Look Like A Nail";
const ATTRIBUTION = "Charlie Munger";

export const HERO_VARIANTS = [
  { key: "A", name: "Thin top strip" },
  { key: "B", name: "Large dismissible card" },
  { key: "C", name: "Corner signature" },
];

/** A: a slim full-width bar hugging the top edge — barely interrupts the Sphere. */
function VariantA() {
  return (
    <div className="border-hairline bg-canvas/90 fixed inset-x-0 top-0 z-10 border-b px-4 py-2 text-center backdrop-blur-sm">
      <p className="text-ink-muted text-xs tracking-tight italic sm:text-sm">
        “{QUOTE}”{" "}
        <span className="text-ink-tertiary not-italic">— {ATTRIBUTION}</span>
      </p>
    </div>
  );
}

/** B: a large centered card, dismissible once read — the loudest of the three. */
function VariantB() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="border-hairline bg-surface-1/95 fixed top-8 left-1/2 z-10 w-[min(90vw,560px)] -translate-x-1/2 rounded-lg border p-6 text-center shadow-2xl backdrop-blur">
      <button
        type="button"
        aria-label="Dismiss quote"
        onClick={() => setDismissed(true)}
        className="text-ink-tertiary hover:text-ink absolute top-3 right-3 text-sm leading-none"
      >
        ✕
      </button>
      <p className="text-ink text-lg leading-snug font-medium tracking-[-0.2px] sm:text-2xl">
        “{QUOTE}”
      </p>
      <p className="text-ink-subtle mt-3 text-xs tracking-[0.4px] uppercase">
        {ATTRIBUTION}
      </p>
    </div>
  );
}

/** C: a small, permanent, editorial-style signature tucked in a corner — the quietest of the three. */
function VariantC() {
  return (
    <div className="fixed top-16 left-4 z-10 max-w-[220px]">
      <p className="text-ink-tertiary text-[11px] leading-snug tracking-tight italic">
        “{QUOTE}”
      </p>
      <p className="text-ink-tertiary mt-1 text-[10px] tracking-[0.4px] uppercase">
        — {ATTRIBUTION}
      </p>
    </div>
  );
}

export function HeroQuote({ variant }: { variant: string }) {
  if (variant === "B") return <VariantB />;
  if (variant === "C") return <VariantC />;
  return <VariantA />;
}

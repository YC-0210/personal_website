"use client";

/**
 * ADR-0004 prototypes for issue #23 — throwaway. Removed before merge.
 *
 * Three directions for the Charlie Munger quote over the Sphere, switchable
 * via `?variant=` on this one route. They disagree about what the quote *is*:
 * a masthead (A), a caption on the artefact (B), or the frame the Sphere sits
 * inside (C) — not one idea at three intensities.
 *
 * The dummy chrome is the real page's fixed controls in their real positions,
 * so a banner that collides with them is visible here rather than in review.
 */

import { Suspense } from "react";

import {
  ProtoSphere,
  useProtoLayout,
  useProtoSelection,
  LINEAR_CURVE,
} from "../proto-sphere";
import { ProtoSwitcher, useVariant, type ProtoVariant } from "../proto-switcher";

const QUOTE = "To The Man With A Hammer, Every Problem Tends To Look Like A Nail";
const ATTRIBUTION = "Charlie Munger";

const VARIANTS: ProtoVariant[] = [
  {
    key: "A",
    name: "A · Masthead",
    note: "One centred display line across the top. The quote is the page's title.",
  },
  {
    key: "B",
    name: "B · Margin plate",
    note: "A small hairline plate on the left edge. The quote captions the Sphere.",
  },
  {
    key: "C",
    name: "C · Bracket",
    note: "The clause split top and bottom. The Sphere sits inside the sentence.",
  },
];

/**
 * The controls that already live at fixed positions on the real page. Not part
 * of what is being judged — they are here so collisions are obvious.
 */
function ProtoChrome() {
  return (
    <div className="pointer-events-none">
      <span className="border-hairline bg-surface-1 text-ink fixed top-4 left-4 rounded-md border px-3 py-1.5 text-sm font-medium opacity-70">
        List view
      </span>
      <span className="border-hairline bg-surface-1 text-ink-subtle fixed top-4 right-4 rounded-md border px-3 py-1.5 text-sm font-medium opacity-70">
        Owner
      </span>
      <span className="bg-primary text-on-primary fixed right-4 bottom-4 rounded-md px-3.5 py-1.5 text-sm font-medium opacity-70">
        Add Atom
      </span>
    </div>
  );
}

/**
 * A — Masthead. The quote runs as one centred display line at the top, on a
 * scrim that fades to nothing so the Sphere still reads as edge-to-edge. Type
 * is the loudest thing on the page; the Sphere is what sits under the title.
 */
function VariantA() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-10 bg-gradient-to-b from-[#010102] via-[#010102]/85 to-transparent pt-10 pb-20 text-center">
      <h1 className="text-ink mx-auto max-w-5xl px-6 text-[clamp(1.5rem,4.2vw,3.5rem)] leading-[1.1] font-semibold tracking-[-0.04em] text-balance">
        “{QUOTE}”
      </h1>
      <p className="text-ink-subtle mt-4 text-[13px] font-medium tracking-[0.4px] uppercase">
        {ATTRIBUTION}
      </p>
    </div>
  );
}

/**
 * B — Margin plate. The quote is demoted to a caption: a narrow surface-1 plate
 * on the left edge, vertically centred, clear of every existing control. The
 * Sphere keeps the whole middle of the screen and stays the loudest thing.
 */
function VariantB() {
  return (
    <aside className="border-hairline bg-surface-1/90 pointer-events-none fixed top-1/2 left-4 z-10 w-64 max-w-[calc(100vw-2rem)] -translate-y-1/2 rounded-lg border p-5 backdrop-blur max-md:top-auto max-md:bottom-28 max-md:translate-y-0">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px] uppercase">
        {ATTRIBUTION}
      </p>
      <p className="text-ink mt-2 text-[17px] leading-[1.45] font-medium tracking-[-0.01em]">
        “{QUOTE}”
      </p>
    </aside>
  );
}

/**
 * C — Bracket. The sentence is split at its comma and set above and below the
 * Sphere in large, low-contrast type, so the Sphere is literally the thing
 * between the hammer and the nail. Both halves clear the control rows.
 */
function VariantC() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <p className="text-ink absolute inset-x-0 top-20 px-6 text-center text-[clamp(1.25rem,3.6vw,2.75rem)] leading-[1.15] font-medium tracking-[-0.03em] text-balance opacity-80 max-md:top-16">
        To the man with a hammer,
      </p>
      <p className="text-ink absolute inset-x-0 bottom-20 px-6 text-center text-[clamp(1.25rem,3.6vw,2.75rem)] leading-[1.15] font-medium tracking-[-0.03em] text-balance opacity-80 max-md:bottom-32">
        every problem tends to look like a nail.
        <span className="text-ink-tertiary mt-3 block text-[13px] font-medium tracking-[0.4px] uppercase">
          {ATTRIBUTION}
        </span>
      </p>
    </div>
  );
}

/** `useSearchParams` needs a boundary to bail out of prerendering behind. */
export default function HeroPrototypes() {
  return (
    <Suspense fallback={null}>
      <HeroPrototypeRoute />
    </Suspense>
  );
}

function HeroPrototypeRoute() {
  const variant = useVariant(VARIANTS);
  const layout = useProtoLayout(LINEAR_CURVE);
  const selection = useProtoSelection();

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoSphere layout={layout} selection={selection} />

      {variant.key === "A" && <VariantA />}
      {variant.key === "B" && <VariantB />}
      {variant.key === "C" && <VariantC />}

      <ProtoChrome />
      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

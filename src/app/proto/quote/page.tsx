"use client";

/**
 * ADR-0004 prototypes for issue #23, round two — throwaway. Removed before merge.
 *
 * Round one put the quote *over* the Sphere and the Owner rejected all three:
 * the quote is to have its own section and never cover the Sphere. That
 * reverses what issue #23 originally specified, so the issue was updated.
 *
 * The three directions below are drawn from established pull-quote practice
 * rather than invented:
 *
 *  - A, the full-bleed quote with an oversized decorative opening mark — the
 *    editorial treatment Smashing Magazine calls a standalone testimonial and
 *    CSS-Tricks calls the single oversized mark.
 *  - B, the side pull quote set beside the content with a rule marking it off —
 *    Smashing's "lines and indentation", the most conventional of the three.
 *  - C, the epigraph: small, quiet, hairline-bounded, closer to a footnote than
 *    a headline.
 *
 * All three keep the Sphere in view and untouched, which is the point.
 */

import { Suspense } from "react";

import { LOG_CURVE, ProtoSphere, useProtoLayout, useProtoSelection } from "../proto-sphere";
import { ProtoSwitcher, useVariant, type ProtoVariant } from "../proto-switcher";

const QUOTE = "To the man with a hammer, every problem tends to look like a nail.";
const ATTRIBUTION = "Charlie Munger";

const VARIANTS: ProtoVariant[] = [
  {
    key: "A",
    name: "A · Overture",
    note: "The quote holds the first screen alone. Scroll, and the Sphere holds the next.",
  },
  {
    key: "B",
    name: "B · Beside",
    note: "One screen, two columns. The quote takes a third, the Sphere keeps the rest.",
  },
  {
    key: "C",
    name: "C · Epigraph",
    note: "Sphere first. The quote is a quiet strip under it, sized like a footnote.",
  },
];

function Sphere({ className }: { className: string }) {
  const layout = useProtoLayout(LOG_CURVE);
  const selection = useProtoSelection();
  return (
    <div className={className}>
      <ProtoSphere layout={layout} selection={selection} />
    </div>
  );
}

/**
 * A — Overture. Full-bleed, one screen, nothing else on it. An oversized
 * opening mark sits behind the type in the accent, and a hairline rule carries
 * the attribution. The Sphere is the next screen down, complete and uncovered.
 */
function VariantA() {
  return (
    <div className="h-dvh snap-y snap-mandatory overflow-y-auto">
      <section className="relative grid h-dvh snap-start place-items-center px-6">
        <span
          aria-hidden
          className="text-primary pointer-events-none absolute top-[8%] left-1/2 -translate-x-1/2 font-serif text-[28rem] leading-none opacity-[0.07] select-none"
        >
          &ldquo;
        </span>
        <blockquote className="relative mx-auto max-w-4xl text-center">
          <p className="text-ink text-[clamp(1.75rem,5vw,4.25rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-balance">
            {QUOTE}
          </p>
          <footer className="mt-10">
            <span aria-hidden className="border-hairline mx-auto block w-24 border-t" />
            <cite className="text-ink-subtle mt-5 block text-[13px] font-medium tracking-[0.4px] whitespace-nowrap not-italic uppercase">
              {ATTRIBUTION}
            </cite>
          </footer>
        </blockquote>
        {/* Sits high to clear the prototype switcher, which is not the design. */}
        <span className="text-ink-tertiary absolute bottom-28 text-xs">
          Scroll ↓
        </span>
      </section>

      <section className="h-dvh snap-start">
        <Sphere className="h-full w-full" />
      </section>
    </div>
  );
}

/**
 * B — Beside. The conventional side pull quote, made structural: the quote is a
 * bounded column on the left with an accent rule down its edge, the Sphere owns
 * the right. Everything is on one screen and nothing scrolls.
 */
function VariantB() {
  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="border-hairline flex flex-col justify-center border-b px-8 py-10 md:border-r md:border-b-0">
        <blockquote className="border-primary border-l-2 pl-5">
          <p className="text-ink text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.4] font-medium tracking-[-0.02em]">
            {QUOTE}
          </p>
          <footer className="mt-4">
            <cite className="text-ink-subtle text-[13px] font-medium tracking-[0.4px] not-italic uppercase">
              {ATTRIBUTION}
            </cite>
          </footer>
        </blockquote>
      </section>

      <Sphere className="min-h-0" />
    </div>
  );
}

/**
 * C — Epigraph. The Sphere is the page; the quote is a thin band beneath it,
 * hairline top and bottom, set at reading size with the attribution inline. It
 * annotates rather than announces — the least loud of the three by some way.
 */
function VariantC() {
  return (
    <div className="h-dvh overflow-y-auto">
      <section className="h-[70dvh]">
        <Sphere className="h-full w-full" />
      </section>

      <section className="border-hairline border-y px-6 py-10">
        <blockquote className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-baseline md:gap-8">
          <p className="text-ink-tertiary shrink-0 text-[13px] font-medium tracking-[0.4px] uppercase">
            The thesis
          </p>
          <p className="text-ink-muted text-[clamp(1rem,1.6vw,1.25rem)] leading-[1.55]">
            {QUOTE}{" "}
            <cite className="text-ink-subtle not-italic">— {ATTRIBUTION}</cite>
          </p>
        </blockquote>
      </section>

      {/* Clearance for the prototype switcher, which is not part of the design. */}
      <div className="h-32" />
    </div>
  );
}

export default function QuotePrototypes() {
  return (
    <Suspense fallback={null}>
      <QuotePrototypeRoute />
    </Suspense>
  );
}

function QuotePrototypeRoute() {
  const variant = useVariant(VARIANTS);

  return (
    <main className="bg-canvas fixed inset-0 overflow-hidden">
      {variant.key === "A" && <VariantA />}
      {variant.key === "B" && <VariantB />}
      {variant.key === "C" && <VariantC />}

      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

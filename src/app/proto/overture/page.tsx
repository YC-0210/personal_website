"use client";

/**
 * ADR-0004 prototypes for issue #23, round three — throwaway. Removed before merge.
 *
 * Overture won round two: the quote holds the first screen alone, the Sphere
 * holds the next. That typography is now fixed — oversized opening mark,
 * centred display line, hairline rule over the attribution — and is identical
 * in all three below. What differs is the *handoff*: what the scroll between
 * the two screens actually does.
 *
 * The three mechanics are named patterns rather than invented ones:
 *
 *  - A · Recede — sticky element fading and scaling down over its exit range
 *    while the next panel slides over it. The pattern Chrome's scroll-driven
 *    animation docs and Builder.io's write-up both build as the hero exit.
 *  - B · Aperture — clip-path reveal: the next panel opens through an expanding
 *    circle rather than sliding. Chrome's docs list it as a distinct reveal.
 *  - C · Arrival — scale-in from depth, the stacking-cards mechanic inverted:
 *    the Sphere starts small and far and comes to you as the quote lifts away.
 *
 * Driven by a scroll listener rather than `animation-timeline`, so the
 * comparison is the same in every browser the Owner might open it in.
 */

import { Suspense, useEffect, useRef, useState } from "react";

import { LOG_CURVE, ProtoSphere, useProtoLayout, useProtoSelection } from "../proto-sphere";
import { ProtoSwitcher, useVariant, type ProtoVariant } from "../proto-switcher";

const QUOTE = "To the man with a hammer, every problem tends to look like a nail.";
const ATTRIBUTION = "Charlie Munger";

const VARIANTS: ProtoVariant[] = [
  {
    key: "A",
    name: "A · Recede",
    note: "The quote shrinks and fades back; the Sphere's panel slides up over it.",
  },
  {
    key: "B",
    name: "B · Aperture",
    note: "The Sphere opens through a widening circle, like a lens.",
  },
  {
    key: "C",
    name: "C · Arrival",
    note: "The Sphere starts far away and comes to you as the quote lifts off.",
  },
];

/** 0 while the quote fills the screen, 1 once the Sphere has fully taken over. */
function useHandoffProgress(container: React.RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const span = element.clientHeight || 1;
      setProgress(Math.min(1, Math.max(0, element.scrollTop / span)));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      element.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [container]);

  return progress;
}

/** The agreed Overture typography. Identical in all three variants. */
function QuotePlate({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 grid place-items-center px-6"
      style={style}
    >
      <blockquote className="relative mx-auto max-w-4xl text-center">
        <span
          aria-hidden
          className="text-primary absolute -top-[38%] left-1/2 -translate-x-1/2 font-serif text-[24rem] leading-none opacity-[0.07] select-none"
        >
          &ldquo;
        </span>
        <p className="text-ink relative text-[clamp(1.75rem,5vw,4.25rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-balance">
          {QUOTE}
        </p>
        <footer className="relative mt-10">
          <span aria-hidden className="border-hairline mx-auto block w-24 border-t" />
          <cite className="text-ink-subtle mt-5 block text-[13px] font-medium tracking-[0.4px] whitespace-nowrap not-italic uppercase">
            {ATTRIBUTION}
          </cite>
        </footer>
      </blockquote>
    </div>
  );
}

function SphereFill({
  style,
  transparent = false,
}: {
  style?: React.CSSProperties;
  transparent?: boolean;
}) {
  const layout = useProtoLayout(LOG_CURVE);
  const selection = useProtoSelection();
  return (
    <div className="absolute inset-0" style={style}>
      <ProtoSphere
        layout={layout}
        selection={selection}
        transparent={transparent}
      />
    </div>
  );
}

function ScrollHint({ progress }: { progress: number }) {
  return (
    <span
      className="text-ink-tertiary pointer-events-none fixed bottom-28 left-1/2 -translate-x-1/2 text-xs"
      style={{ opacity: 1 - progress * 3 }}
    >
      Scroll ↓
    </span>
  );
}

/**
 * A — Recede. The quote is sticky and animates over its own exit: opacity to 0,
 * scale to 0.82. The Sphere's panel travels up over it under its own scroll, so
 * the quote reads as passing *behind* the Sphere rather than being replaced.
 */
function VariantA({ progress }: { progress: number }) {
  return (
    <>
      <QuotePlate
        style={{
          position: "fixed",
          opacity: Math.max(0, 1 - progress * 1.6),
          transform: `scale(${1 - progress * 0.18})`,
        }}
      />
      <div className="relative h-dvh" />
      <div className="bg-canvas relative h-dvh">
        <SphereFill />
      </div>
    </>
  );
}

/**
 * B — Aperture. The quote stays exactly where it is and the Sphere is cut
 * through it by a circle opening from the centre. Nothing moves except the
 * hole, which makes the Sphere feel like it was always behind the page.
 */
function VariantB({ progress }: { progress: number }) {
  // `circle()` percentages resolve against the viewport's diagonal, so half of
  // it covers the corners — anything past ~55 finishes the reveal early and
  // wastes the rest of the scroll.
  const radius = progress * 55;
  return (
    <>
      <QuotePlate
        style={{ position: "fixed", opacity: Math.max(0, 1 - progress * 1.4) }}
      />
      <SphereFill
        style={{
          position: "fixed",
          clipPath: `circle(${radius}% at 50% 50%)`,
        }}
      />
      <div className="relative h-dvh" />
      <div className="relative h-dvh" />
    </>
  );
}

/**
 * C — Arrival. The Sphere starts small, dim and far off, and scales up to fill
 * the screen while the quote lifts away upward. The one that reads as motion
 * through space rather than as a page transition.
 */
function VariantC({ progress }: { progress: number }) {
  return (
    <>
      <QuotePlate
        style={{
          position: "fixed",
          opacity: Math.max(0, 1 - progress * 1.8),
          transform: `translateY(${-progress * 22}vh)`,
        }}
      />
      <SphereFill
        transparent
        style={{
          position: "fixed",
          opacity: 0.15 + progress * 0.85,
          transform: `scale(${0.45 + progress * 0.55})`,
        }}
      />
      <div className="relative h-dvh" />
      <div className="relative h-dvh" />
    </>
  );
}

export default function OverturePrototypes() {
  return (
    <Suspense fallback={null}>
      <OvertureRoute />
    </Suspense>
  );
}

function OvertureRoute() {
  const variant = useVariant(VARIANTS);
  const container = useRef<HTMLDivElement>(null);
  const progress = useHandoffProgress(container);

  return (
    <main className="bg-canvas fixed inset-0 overflow-hidden">
      {/*
        Deliberately not scroll-snapped. Mandatory snap jumps the reader from
        one screen to the next and they never see the handoff — which is the
        only thing this round is asking about. Free scroll lets it be scrubbed.
      */}
      <div ref={container} className="h-dvh overflow-y-auto">
        {variant.key === "A" && <VariantA progress={progress} />}
        {variant.key === "B" && <VariantB progress={progress} />}
        {variant.key === "C" && <VariantC progress={progress} />}
      </div>

      <ScrollHint progress={progress} />
      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

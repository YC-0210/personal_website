"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The hero quote — Overture, with the Recede handoff (issue #23, ADR-0004).
 *
 * The quote holds the first screen on its own and the Sphere holds the next.
 * Scrolling fades the quote out and eases it back while the Sphere's panel
 * travels up over it, so the quote reads as passing *behind* the Sphere rather
 * than being swapped for it.
 *
 * The Sphere is never covered: it owns its screen outright, which is the point
 * the first prototype round got wrong.
 */

const QUOTE = "To the man with a hammer, every problem tends to look like a nail.";
const ATTRIBUTION = "Charlie Munger";

/** How much of the fade is spent by the time the Sphere's panel is halfway up. */
const FADE_RATE = 1.6;
/** How far the quote eases back as it goes. */
const RECEDE_SCALE = 0.18;

/**
 * How far the reader is between the quote's screen and the Sphere's: 0 while
 * the quote fills the viewport, 1 once the Sphere has taken it over.
 */
export function useHandoffProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const span = window.innerHeight || 1;
      setProgress(Math.min(1, Math.max(0, window.scrollY / span)));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

function usePrefersReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

export function HeroQuote({ progress }: { progress: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const opacity = Math.max(0, 1 - progress * FADE_RATE);

  return (
    <div
      // Fixed rather than sticky so the Sphere's panel passes over it cleanly.
      // Inert once faded, so it can never swallow a tap meant for the Sphere.
      aria-hidden={progress > 0.5}
      className="pointer-events-none fixed inset-0 z-0 grid place-items-center px-6"
      style={{
        opacity,
        // Reduced motion keeps the fade and drops the movement.
        transform: reducedMotion ? undefined : `scale(${1 - progress * RECEDE_SCALE})`,
        visibility: opacity <= 0.01 ? "hidden" : undefined,
      }}
    >
      <blockquote className="relative mx-auto max-w-4xl text-center">
        <span
          aria-hidden
          className="text-primary absolute -top-[38%] left-1/2 -translate-x-1/2 font-serif text-[clamp(12rem,34vw,24rem)] leading-none opacity-[0.07] select-none"
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

/** The nudge down to the Sphere. Goes as soon as the reader starts moving. */
export function ScrollCue({ progress }: { progress: number }) {
  const opacity = Math.max(0, 1 - progress * 4);
  if (opacity <= 0.01) return null;

  return (
    <span
      aria-hidden
      className="text-ink-tertiary pointer-events-none fixed bottom-8 left-1/2 z-0 -translate-x-1/2 text-xs"
      style={{ opacity }}
    >
      Scroll ↓
    </span>
  );
}

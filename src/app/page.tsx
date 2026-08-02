"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { AtomDetailPanel } from "@/components/atom-detail-panel";
import { AtomEditor } from "@/components/atom-editor";
import { ConnectionEditor } from "@/components/connection-editor";
import {
  HERO_VARIANTS,
  HeroQuote,
} from "@/components/hero-quote-prototype";
import { OwnerAffordance } from "@/components/owner-affordance";
import {
  PrototypeSwitcher,
  usePrototypeVariant,
} from "@/components/prototype-switcher";
import { SphereListView } from "@/components/sphere-list-view";
import { SphereScene } from "@/components/sphere-scene";
import { isWebGLSupported } from "@/lib/webgl-support";
import { setPrototypeRankCurve } from "@/sphere/rank";
import {
  RANK_CURVE_VARIANTS,
  curveFor,
} from "@/sphere/rank-curve-prototype";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

function statusMessage(
  status: string,
  atomCount: number,
  error: string | null,
): string {
  if (status === "error") return `The Sphere could not be loaded. ${error}`;
  if (status === "ready") {
    return atomCount === 0
      ? "The Sphere is empty."
      : `The Sphere holds ${atomCount} knowledge atoms.`;
  }
  return "Loading the Sphere.";
}

/** WebGL support never changes within a page load; there is nothing to watch. */
function subscribeToNothing(): () => void {
  return () => {};
}

export default function Home() {
  const { status, atoms, error } = useSphere();

  /**
   * Whether this browser can raise WebGL at all — unknown until after the first
   * client render, since the server can't probe. Without it the text index *is*
   * the page, not a fallback.
   */
  const hasWebGL = useSyncExternalStore(
    subscribeToNothing,
    isWebGLSupported,
    () => null,
  );

  const [wantsList, setWantsList] = useState(false);
  const showList = wantsList || hasWebGL === false;

  // PROTOTYPE ONLY (issues #23, #24) — drop both hooks, the effect below,
  // and the two <PrototypeSwitcher>s once each direction is chosen.
  const hero = usePrototypeVariant("hero", HERO_VARIANTS);
  const curve = usePrototypeVariant("curve", RANK_CURVE_VARIANTS);

  useEffect(() => {
    setPrototypeRankCurve(curveFor(curve.current));
    getSphereStore().refreshLayout();
    // Only `curve.current` (a primitive) should retrigger this — `curve` itself
    // is a fresh object every render, so including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve.current]);

  return (
    <main className="fixed inset-0 overflow-hidden">
      <h1 className="sr-only">Knowledge Sphere</h1>

      <HeroQuote variant={hero.current} />

      {hasWebGL && !showList && <SphereScene />}
      {showList && <SphereListView />}

      {/*
        The way into the text index for anyone who prefers reading to
        orbiting — and the way back. When WebGL is missing there is no scene
        to return to, so the toggle disappears rather than offering one.
      */}
      {hasWebGL && (
        <button
          type="button"
          aria-pressed={showList}
          onClick={() => setWantsList(!showList)}
          className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 fixed top-4 left-4 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          {showList ? "Sphere view" : "List view"}
        </button>
      )}

      {!showList && <AtomDetailPanel />}
      <OwnerAffordance />
      <AtomEditor />
      <ConnectionEditor />
      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>

      <PrototypeSwitcher
        paramName="hero"
        variants={HERO_VARIANTS}
        current={hero.current}
        cycle={hero.cycle}
        side="left"
      />
      <PrototypeSwitcher
        paramName="curve"
        variants={RANK_CURVE_VARIANTS}
        current={curve.current}
        cycle={curve.cycle}
        side="right"
      />
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { AtomDetailPanel } from "@/components/atom-detail-panel";
import { AtomEditor } from "@/components/atom-editor";
import { ConnectionEditor } from "@/components/connection-editor";
import {
  HeroQuote,
  ScrollCue,
  useHandoffProgress,
} from "@/components/hero-quote";
import { OwnerAffordance } from "@/components/owner-affordance";
import { SphereListView } from "@/components/sphere-list-view";
import { SphereScene } from "@/components/sphere-scene";
import { isWebGLSupported } from "@/lib/webgl-support";
import { useSphere } from "@/sphere/use-sphere";

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

/**
 * Past this much of the handoff the Sphere owns the screen, so its controls
 * belong on it. Below it they would be floating over the quote.
 */
const SPHERE_ENGAGED_AT = 0.6;

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

  const progress = useHandoffProgress();
  const isSphereEngaged = progress > SPHERE_ENGAGED_AT;

  return (
    <main>
      <h1 className="sr-only">Knowledge Sphere</h1>

      <HeroQuote progress={progress} />
      <ScrollCue progress={progress} />

      {/* The quote's screen. Nothing in it but the quote behind. */}
      <div className="h-dvh" />

      {/*
        The Sphere's screen. Opaque, so it travels up *over* the receding quote
        rather than letting it show through, and tall enough to hold the scene
        outright — the Sphere is never covered by the quote.
      */}
      <div className="bg-canvas relative z-10 h-dvh">
        {hasWebGL && !showList && <SphereScene />}
        {showList && (
          <div className="h-full overflow-y-auto">
            <SphereListView />
          </div>
        )}
      </div>

      {/*
        Every fixed control belongs to the Sphere, so none of them appear until
        the Sphere has the screen. Their positions are unchanged from before.
      */}
      {isSphereEngaged && (
        <>
          {hasWebGL && (
            <button
              type="button"
              aria-pressed={showList}
              onClick={() => setWantsList(!showList)}
              className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 fixed top-4 left-4 z-20 rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              {showList ? "Sphere view" : "List view"}
            </button>
          )}

          <Link
            href="/articles"
            className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 fixed top-4 right-4 z-20 rounded-md border px-3 py-1.5 text-sm font-medium max-md:top-auto max-md:bottom-32"
          >
            Articles
          </Link>

          {!showList && <AtomDetailPanel />}
          <OwnerAffordance />
          <AtomEditor />
          <ConnectionEditor />
        </>
      )}

      {/* ADR-0004 temporary: way into the prototypes. Removed with /proto. */}
      <Link
        href="/proto"
        className="border-hairline bg-surface-1 text-ink-subtle fixed bottom-4 left-4 z-20 rounded-md border px-3 py-1.5 text-sm font-medium"
      >
        Prototypes
      </Link>

      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>
    </main>
  );
}

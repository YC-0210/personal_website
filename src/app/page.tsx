"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

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
import { atomIdFromHash } from "@/sphere/atom-link";
import { sceneNotice } from "@/sphere/scene-notice";
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

/**
 * Past this much of the handoff the Sphere owns the screen, so its controls
 * belong on it. Below it they would be floating over the quote.
 */
const SPHERE_ENGAGED_AT = 0.6;

/**
 * The empty and failed states, as a sighted visitor reads them.
 *
 * Centred on the canvas rather than in a corner: when it shows there is nothing
 * else on the screen, so it *is* the screen. Surfaces, hairline, radius and type
 * are DESIGN.md tokens, and lavender stays off it — this is not a CTA.
 *
 * `aria-hidden` because the `role="status"` paragraph at the foot of the page
 * already says all of this; without it a screen reader hears it twice.
 */
function SceneNotice({ title, detail }: { title: string; detail: string | null }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6"
    >
      <div className="border-hairline bg-surface-1 max-w-md rounded-lg border px-6 py-5 text-center">
        <p className="text-ink text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
          {title}
        </p>
        {detail && (
          <p className="text-ink-subtle mt-2 text-sm leading-relaxed break-words">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { status, atoms, error, isEditMode } = useSphere();

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

  // The List view says both of these itself, so the notice is the scene's alone.
  const notice = showList
    ? null
    : sceneNotice({ status, atomCount: atoms.length, error, isEditMode });

  /**
   * Following a Bonding out of an Article lands here as `/#atom-<id>`. The
   * Sphere has to be loaded before the id means anything, so this waits for
   * `ready` rather than firing on mount.
   */
  useEffect(() => {
    if (status !== "ready") return;

    const followHash = () => {
      const atomId = atomIdFromHash(window.location.hash);
      if (atomId === null) return;

      const store = getSphereStore();
      if (!store.hasAtom(atomId)) return;
      store.selectAtom(atomId);

      // The quote owns the first screen. Arriving on a named Atom is a reader
      // who has already been somewhere — hand them the Sphere directly. In the
      // List view the anchor does its own scrolling, inside its own scroller.
      if (!showList) window.scrollTo(0, window.innerHeight);
    };

    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [status, showList]);

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
        {notice && <SceneNotice {...notice} />}
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

      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { AtomDetailPanel } from "@/components/atom-detail-panel";
import { AtomEditor } from "@/components/atom-editor";
import { ConnectionEditor } from "@/components/connection-editor";
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

  return (
    <main className="fixed inset-0 overflow-hidden">
      <h1 className="sr-only">Knowledge Sphere</h1>

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

      {/* The way off the Sphere and into the writing. */}
      <Link
        href="/articles"
        className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 fixed top-4 right-4 rounded-md border px-3 py-1.5 text-sm font-medium max-md:top-auto max-md:bottom-32"
      >
        Articles
      </Link>

      {/* ADR-0004 temporary: way into the hero-quote and Rank prototypes. Removed with /proto. */}
      <a
        href="/proto"
        className="border-hairline bg-surface-1 text-ink-subtle fixed bottom-4 left-4 rounded-md border px-3 py-1.5 text-sm font-medium"
      >
        Prototypes
      </a>

      {!showList && <AtomDetailPanel />}
      <OwnerAffordance />
      <AtomEditor />
      <ConnectionEditor />
      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>
    </main>
  );
}

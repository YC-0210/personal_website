"use client";

import { useSyncExternalStore } from "react";

import { OwnerAffordance } from "@/components/owner-affordance";
import { SphereDetail } from "@/components/sphere-detail";
import { SphereOutline } from "@/components/sphere-outline";
import { SphereScene } from "@/components/sphere-scene";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";
import { supportsWebGL } from "@/sphere/webgl";

/** WebGL support never changes for the life of the page. */
const subscribeNever = () => () => {};

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

export default function Home() {
  const { status, atoms, error, selectedAtomId } = useSphere();

  // Answered in the browser only: the server has no WebGL either way, and
  // mounting the canvas just to have it fail is worse than one frame of
  // nothing. `null` on the server keeps the markup identical across hydration.
  const canRender = useSyncExternalStore(
    subscribeNever,
    supportsWebGL,
    () => null,
  );

  return (
    <main className="fixed inset-0 overflow-hidden">
      <h1 className="sr-only">Knowledge Sphere</h1>

      {canRender === true && (
        <>
          <SphereScene />
          {/*
            The detail overlay sits above the canvas but must not swallow the
            Sphere's own clicks — only its controls take the pointer.
          */}
          <div className="pointer-events-none absolute inset-0">
            <SphereDetail />
          </div>
          {selectedAtomId && (
            <button
              type="button"
              onClick={() => getSphereStore().clearSelection()}
              className="border-hairline bg-surface-1 text-ink-subtle hover:text-ink hover:border-hairline-strong absolute top-4 right-4 flex h-11 items-center rounded-md border px-3.5 text-sm font-medium"
            >
              Exit
            </button>
          )}
        </>
      )}

      {/*
        Always in the document for screen readers, and the whole page when
        there is no WebGL to draw the Sphere with.
      */}
      <SphereOutline visible={canRender === false} />

      <OwnerAffordance />

      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>
    </main>
  );
}

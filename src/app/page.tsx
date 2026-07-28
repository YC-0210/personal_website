"use client";

import { OwnerAffordance } from "@/components/owner-affordance";
import { SphereScene } from "@/components/sphere-scene";
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

export default function Home() {
  const { status, atoms, error } = useSphere();

  return (
    <main className="fixed inset-0 overflow-hidden">
      <h1 className="sr-only">Knowledge Sphere</h1>
      <SphereScene />
      <OwnerAffordance />
      {/*
        A placeholder for the text fallback of every Atom and Connection, which
        the mobile & accessibility ticket builds out properly.
      */}
      <p role="status" className="sr-only">
        {statusMessage(status, atoms.length, error)}
      </p>
    </main>
  );
}

"use client";

import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The Sphere as text: every Atom by Rank, with the Connections leading away
 * from it.
 *
 * This is not a summary of the 3D scene, it is the same content in a form that
 * does not need WebGL, a pointer or working eyes. It is always in the document
 * — screen readers get it whether or not the canvas rendered — and it becomes
 * visible when there is no WebGL to render the Sphere with.
 */
export function SphereOutline({ visible }: { visible: boolean }) {
  const { status, error } = useSphere();
  const outline = getSphereStore().outline();

  return (
    <div
      className={
        visible
          ? "bg-canvas absolute inset-0 overflow-y-auto"
          : "sr-only"
      }
    >
      <div className="mx-auto max-w-[680px] px-6 pt-9 pb-20">
        <h2 className="text-ink text-[32px] leading-tight font-semibold tracking-[-0.8px]">
          Every Atom
        </h2>
        <p className="text-ink-subtle mt-1.5 text-[15px] leading-relaxed">
          Most time invested first, with the Connections leading away from each.
          The same knowledge the Sphere draws.
        </p>

        {status === "error" && (
          <p role="alert" className="text-ink-muted mt-4 text-sm">
            The Sphere could not be loaded. {error}
          </p>
        )}

        {status === "ready" && outline.length === 0 && (
          <p className="text-ink-subtle mt-4 text-sm">The Sphere is empty.</p>
        )}

        {outline.map(({ atom, connections }) => (
          <section
            key={atom.id}
            id={atom.id}
            aria-labelledby={`${atom.id}-heading`}
            className="border-hairline mt-0 border-t pt-5.5 pb-1"
          >
            <h3
              id={`${atom.id}-heading`}
              className="text-ink text-xl font-semibold tracking-[-0.35px]"
            >
              {atom.label}
            </h3>
            <p className="text-ink-tertiary mt-1 text-xs tabular-nums">
              {atom.hoursSpent.toLocaleString("en-US")} hours
            </p>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {atom.description}
            </p>

            {connections.length > 0 && (
              <ul className="mt-3.5 list-none p-0">
                {connections.map((connection) => (
                  <li
                    key={connection.id}
                    className="border-surface-3 border-t py-2.5 text-[13px] leading-relaxed"
                  >
                    <a
                      href={`#${connection.toAtomId}`}
                      className="text-ink border-hairline-strong hover:text-primary-hover hover:border-primary-hover border-b font-medium no-underline"
                    >
                      {connection.toLabel}
                    </a>{" "}
                    <span className="text-ink-subtle">
                      — {connection.description} (strength{" "}
                      {connection.strength.toFixed(2)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

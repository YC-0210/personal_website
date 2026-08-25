"use client";

import { atomAnchor } from "@/sphere/atom-link";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The text index of the Sphere: every Atom and its Connections as a plain,
 * keyboard-navigable document. This is what screen readers and browsers
 * without WebGL get instead of the 3D scene, and what the "List" toggle shows
 * anyone who prefers reading to orbiting.
 *
 * Each Connection is an in-page link to the Atom at its far end, so the
 * click-to-navigate loop of the scene survives translation: following a link
 * moves you to that Atom's entry. All data comes from `sphereIndex()`, which
 * derives from the same state the scene draws.
 */
export function SphereListView() {
  const { status, error } = useSphere();
  const index = getSphereStore().sphereIndex();

  return (
    <section
      aria-label="All Atoms and Connections"
      className="bg-canvas fixed inset-0 overflow-y-auto"
    >
      {/* Top padding clears the fixed view toggle and the Owner's corner mark. */}
      <div className="mx-auto w-full max-w-2xl px-4 pt-28 pb-24">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ATOM INDEX
        </p>
        <h2 className="text-ink mt-2 text-[28px] leading-[1.2] font-semibold tracking-[-0.6px]">
          Every Atom, and how they connect
        </h2>
        <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
          The same knowledge the Sphere shows, as a list. Atoms are ordered by
          time invested; each Connection links to the Atom at its far end.
        </p>

        {status === "error" && (
          <p role="alert" className="text-ink-muted mt-8 text-sm">
            The Sphere could not be loaded. {error}
          </p>
        )}
        {status !== "error" && index.length === 0 && (
          <p className="text-ink-subtle mt-8 text-sm">
            {status === "ready" ? "The Sphere is empty." : "Loading the Sphere…"}
          </p>
        )}

        <ul className="mt-6">
          {index.map(({ atom, connections }) => (
            <li
              key={atom.id}
              id={atomAnchor(atom.id)}
              // Landing here from a Connection link scrolls the entry clear of
              // the viewport edge, and target styling marks the arrival.
              className="border-hairline target:border-primary scroll-mt-6 border-t py-6 target:border-t-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-ink text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
                  {atom.label}
                </h3>
                <p className="bg-surface-2 text-ink-muted rounded-full px-2 py-0.5 text-xs whitespace-nowrap">
                  {atom.hoursSpent.toLocaleString()} hrs
                </p>
              </div>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                {atom.description}
              </p>

              <p className="text-ink-tertiary mt-4 text-[13px] font-medium tracking-[0.4px]">
                CONNECTIONS · {connections.length}
              </p>
              {connections.length > 0 && (
                <ul className="mt-1">
                  {connections.map(({ connection, otherAtom }) => (
                    <li key={connection.id} className="py-2">
                      <a
                        href={`#${atomAnchor(otherAtom.id)}`}
                        className="text-ink rounded-sm text-sm underline decoration-[var(--color-hairline-tertiary)] underline-offset-4 hover:decoration-[var(--color-primary-hover)]"
                      >
                        {otherAtom.label}
                      </a>
                      <span className="text-ink-subtle text-xs">
                        {" "}
                        · Strength {Math.round(connection.strength * 100)} of
                        100
                      </span>
                      <p className="text-ink-subtle mt-0.5 text-xs leading-normal">
                        {connection.description}
                      </p>
                      {/* The other half of the Explanation. */}
                      {connection.externalLink && (
                        <a
                          href={connection.externalLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary-hover mt-0.5 inline-block text-xs underline-offset-4 hover:underline"
                        >
                          {connection.externalLink} ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** ADR-0004 prototype chooser — throwaway. Removed before merge. */

import Link from "next/link";

const OPEN = [
  {
    href: "/proto/overture?variant=A",
    issue: "Issue #23 · round three",
    name: "Overture · three scroll handoffs",
    description:
      "Overture's typography is settled and identical in all three; what differs is what the scroll between the quote and the Sphere does. A has the quote recede behind the Sphere's panel, B opens the Sphere through a widening aperture, C brings the Sphere toward you from depth. Each is a named scroll-driven pattern rather than an invented one.",
  },
  {
    href: "/proto/orbit-inside?variant=A",
    issue: "Issue #24 · round three",
    name: "Inside the Atom · three directions",
    description:
      "Rings drawn around the Atoms cluttered the scene, so the motion moves inside the Lattice Atom and nothing leaves its silhouette. A is a body circling between core and shell, B adds no geometry at all and carries Rank in the shell's spin and the core's fill, C sets counter-turning bands inside the shell.",
  },
];

const SETTLED = [
  {
    href: "/proto/quote?variant=A",
    issue: "Issue #23 · round two",
    name: "Quote section — settled: A · Overture",
    description:
      "The quote takes the first screen alone and the Sphere the next. Round three is about the scroll between them.",
  },
  {
    href: "/proto/orbit?variant=A",
    issue: "Issue #24 · round two",
    name: "Orbit rings — rejected",
    description:
      "Eighteen rings drawn around eighteen Atoms read as clutter rather than as Rank. That is what round three moves inside the Atom.",
  },
  {
    href: "/proto/rank?variant=A",
    issue: "Issue #24 · round one",
    name: "Rank curve — settled: A · Log",
    description:
      "Kept as the record of the choice. `rankAtoms()` now uses log1p(h) ÷ log1p(max).",
  },
  {
    href: "/proto/hero?variant=A",
    issue: "Issue #23 · round one",
    name: "Hero quote overlay — rejected",
    description:
      "All three put the quote over the Sphere. Rejected on exactly that point, which is what round two is for.",
  },
];

export default function ProtoIndex() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        ADR-0004 PROTOTYPES
      </p>
      <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
        Waiting on you
      </h1>
      <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
        Throwaway — no production code for either round until you have picked.
        The bar at the bottom of each page flips between variants, and so do the
        ← / → keys.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {OPEN.map((round) => (
          <li key={round.href}>
            <Link
              href={round.href}
              className="border-hairline bg-surface-1 hover:bg-surface-2 block rounded-lg border p-5"
            >
              <span className="text-ink-tertiary block text-[13px] font-medium tracking-[0.4px]">
                {round.issue}
              </span>
              <span className="text-ink mt-1 block text-lg font-medium">
                {round.name}
              </span>
              <span className="text-ink-subtle mt-1 block text-sm leading-relaxed">
                {round.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="text-ink-subtle mt-12 text-[13px] font-medium tracking-[0.4px] uppercase">
        Already decided
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {SETTLED.map((round) => (
          <li key={round.href}>
            <Link
              href={round.href}
              className="border-hairline hover:bg-surface-1 block rounded-lg border p-4"
            >
              <span className="text-ink-tertiary block text-xs font-medium tracking-[0.4px]">
                {round.issue}
              </span>
              <span className="text-ink-muted mt-0.5 block text-sm font-medium">
                {round.name}
              </span>
              <span className="text-ink-tertiary mt-1 block text-xs leading-relaxed">
                {round.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

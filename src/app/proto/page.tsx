/** ADR-0004 prototype chooser — throwaway. Removed before merge. */

import Link from "next/link";

const OPEN = [
  {
    href: "/proto/quote?variant=A",
    issue: "Issue #23 · round two",
    name: "Quote section · three directions",
    description:
      "The quote in its own section, never over the Sphere. A gives it the first screen alone and puts the Sphere on the next; B sets it beside the Sphere in a column on one screen; C runs it as a quiet strip under the Sphere, sized like a footnote. Drawn from established pull-quote practice rather than invented — see the notes at the top of the file.",
  },
  {
    href: "/proto/orbit?variant=A",
    issue: "Issue #24 · round two",
    name: "Orbit rings · three directions",
    description:
      "A visible orbit around each Atom, so Rank is something you can see rather than a size to compare across the scene. A is one camera-facing ring, B a tilted ring with a body running round it, C a countable set of rings. All on the log curve, which now ships.",
  },
];

const SETTLED = [
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

/** ADR-0004 prototype chooser — throwaway. Removed before merge. */

import Link from "next/link";

const ROUNDS = [
  {
    href: "/proto/hero?variant=A",
    issue: "Issue #23",
    name: "Hero quote · three directions",
    description:
      "The Munger quote over the Sphere. A sets it as a masthead across the top; B demotes it to a caption plate on the left edge; C splits the clause above and below so the Sphere sits inside the sentence. The page's real fixed controls are drawn in, so collisions show up here.",
  },
  {
    href: "/proto/rank?variant=A",
    issue: "Issue #24",
    name: "Rank curve · three curves",
    description:
      "What time spent buys an Atom. A is log, B is sqrt, C is percentile — plus today's linear curve as a baseline to flip against. Orbit it, and turn on the 10,000-hour outlier to see the bug the issue is about.",
  },
];

export default function ProtoIndex() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        ADR-0004 PROTOTYPES
      </p>
      <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
        Two rounds to pick from
      </h1>
      <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
        Throwaway, per ADR-0004 — no production code is written for either issue
        until you have picked. Each round lives on one route with the variants
        behind <code className="text-ink-muted">?variant=</code>; the bar at the
        bottom flips between them, and so do the ← / → keys.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        {ROUNDS.map((round) => (
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
    </main>
  );
}

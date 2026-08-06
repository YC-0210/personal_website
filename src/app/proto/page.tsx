import Link from "next/link";

/**
 * Index of the open ADR-0004 prototype rounds. THROWAWAY, like everything under
 * `/proto` — this page goes when the last round is decided.
 *
 * It exists because a round is useless if the Owner cannot find it: nothing
 * links to `/proto/*` from the site, deliberately, so this is the one address
 * worth remembering.
 */

const ROUNDS = [
  {
    href: "/proto/draft-marker",
    issue: "#28",
    title: "Marking a draft in an Atom's Dossier",
    blurb:
      "Bonding happens the moment writing starts, so the Dossier lists drafts beside published Articles — and only the Owner sees them. Three ways a row can say “not finished”.",
  },
];

export default function ProtoIndex() {
  return (
    <main className="bg-canvas min-h-dvh px-6 py-14">
      <div className="mx-auto max-w-2xl">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ADR-0004 PROTOTYPE ROUNDS
        </p>
        <h1 className="text-ink mt-2 text-[40px] leading-[1.15] font-semibold tracking-[-1px]">
          Pick a direction
        </h1>
        <p className="text-ink-subtle mt-3 text-base leading-relaxed">
          Anything whose main deliverable is visual gets three genuinely
          different directions before production code. These are throwaway and
          are deleted once chosen.
        </p>

        <ul className="mt-10 flex flex-col">
          {ROUNDS.map((round) => (
            <li key={round.href} className="border-hairline border-t">
              <Link href={round.href} className="group block py-5">
                <span className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                  ISSUE {round.issue}
                </span>
                <span className="text-ink group-hover:text-primary-hover mt-1 block text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
                  {round.title}
                </span>
                <span className="text-ink-subtle mt-1 block text-sm leading-relaxed">
                  {round.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="text-ink-subtle hover:text-ink mt-10 inline-block text-sm font-medium"
        >
          ← Sphere
        </Link>
      </div>
    </main>
  );
}

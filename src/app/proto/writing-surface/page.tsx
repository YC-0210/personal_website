import Link from "next/link";

/**
 * ADR-0004 round 2 — the writing surface (#28). THROWAWAY.
 *
 * The three directions differ on every axis the round has to settle, which is
 * the point: ADR-0004 asks for three genuinely different directions, not one
 * idea at three intensities. The table below is the evidence for that claim —
 * no row has the same answer twice.
 */

const QUESTIONS = [
  "Where the title sits",
  "The toolbar",
  "The + insert",
  "Column, and the empty space",
  "The Sphere",
  "Where the state is said",
] as const;

const DIRECTIONS = [
  {
    href: "/proto/writing-surface/the-page",
    letter: "A",
    title: "The page takes over",
    thesis:
      "Medium read literally. The site goes away and leaves one column of type on the canvas. Every control is summoned; nothing is standing there waiting to be looked at.",
    answers: [
      "The document's own first line, at 42px. Nothing between it and the body but size.",
      "Floats on selection only. Nothing parked.",
      "In the left margin, level with the empty line.",
      "680px centred. The rest is empty canvas, on purpose.",
      "Gone outright.",
      "A top bar held at 55% opacity until you reach for it.",
    ],
  },
  {
    href: "/proto/writing-surface/the-desk",
    letter: "B",
    title: "The desk",
    thesis:
      "The opposite bet: writing is work, and work gets a workspace. The empty half of the screen is spent on a rail that keeps state, Bondings and Publish permanently in view, rather than on margins.",
    answers: [
      "A labelled field above a hairline rule, at 26px — a property of the document, not its first line.",
      "Parked at the top of the column, always visible. Never floats.",
      "On a keystroke: / on an empty line. No affordance to see.",
      "720px, left-aligned. The right side is the rail.",
      "Gone outright.",
      "A standing block in the rail, spelled out in sentences.",
    ],
  },
  {
    href: "/proto/writing-surface/over-the-sphere",
    letter: "C",
    title: "Over the Sphere",
    thesis:
      "Writing is not a separate application, so the site does not disappear for it. A sheet of paper is laid over the Sphere, which keeps turning behind it — an Article never stops being attached to the knowledge it came from.",
    answers: [
      "In a band at the top of the sheet that stays put while the body scrolls under it.",
      "Both. Parked in the band, and re-forms at the selection — never both at once.",
      "Inline, at the end of the empty line itself.",
      "640px inside a sheet with edges. The emptiness is the Sphere.",
      "Stays, at 30% and blurred. Takes no clicks.",
      "In the band beside the title, read as one sentence with it.",
    ],
  },
] as const;

export default function WritingSurfaceRound() {
  return (
    <main className="bg-canvas min-h-dvh px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ISSUE #28 · ADR-0004 ROUND 2
        </p>
        <h1 className="text-ink mt-2 text-[40px] leading-[1.15] font-semibold tracking-[-1px]">
          The writing surface
        </h1>
        <p className="text-ink-subtle mt-3 max-w-2xl text-base leading-relaxed">
          &ldquo;Medium-like&rdquo; fixes far less than it sounds like it does.
          All three are the real editor — Tiptap, the engine decision 1 already
          settled — so <strong className="text-ink-muted">type into them</strong>
          . Select a sentence. Press <code className="text-ink-muted">/</code> or
          reach for the <code className="text-ink-muted">+</code> on the empty
          line near the bottom. Nothing is saved anywhere.
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {DIRECTIONS.map((direction) => (
            <Link
              key={direction.href}
              href={direction.href}
              className="group border-hairline bg-surface-1 hover:bg-surface-2 hover:border-hairline-strong flex flex-col rounded-lg border p-5"
            >
              <span className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                DIRECTION {direction.letter}
              </span>
              <span className="text-ink group-hover:text-primary-hover mt-1 text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
                {direction.title}
              </span>
              <span className="text-ink-subtle mt-3 text-sm leading-relaxed">
                {direction.thesis}
              </span>
              <span className="text-primary-hover mt-4 text-sm font-medium">
                Open and type →
              </span>
            </Link>
          ))}
        </div>

        <h2 className="text-ink mt-16 text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
          What the round settles
        </h2>
        <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
          Six questions, and no row answers the same way twice.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-hairline border-b">
                <th className="text-ink-tertiary w-52 py-3 pr-4 text-left text-[13px] font-medium tracking-[0.4px]">
                  QUESTION
                </th>
                {DIRECTIONS.map((direction) => (
                  <th
                    key={direction.letter}
                    className="text-ink-muted px-4 py-3 text-left font-medium"
                  >
                    {direction.letter} · {direction.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((question, row) => (
                <tr key={question} className="border-hairline border-b align-top">
                  <th className="text-ink-muted py-4 pr-4 text-left font-medium">
                    {question}
                  </th>
                  {DIRECTIONS.map((direction) => (
                    <td
                      key={direction.letter}
                      className="text-ink-subtle px-4 py-4 leading-relaxed"
                    >
                      {direction.answers[row]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-ink-tertiary mt-10 text-sm leading-relaxed">
          Mixing is allowed — &ldquo;A, but say the state the way B does&rdquo;
          is a decision, not a dodge. Once one is chosen, the whole of{" "}
          <code className="text-ink-muted">/proto</code> is deleted.
        </p>

        <Link
          href="/proto"
          className="text-ink-subtle hover:text-ink mt-10 inline-block text-sm font-medium"
        >
          ← All rounds
        </Link>
      </div>
    </main>
  );
}

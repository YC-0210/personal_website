"use client";

/**
 * ADR-0004 prototype round — marking a bonded Article as an unfinished draft.
 * THROWAWAY. Delete this route once a direction is chosen (issue #28).
 *
 * The question: in an Atom's Dossier, the "WRITTEN ABOUT" list will now hold
 * both published Articles and drafts the Owner is still writing. Only the Owner
 * ever sees the drafts. How does a row say "this one isn't finished"?
 *
 * Three genuinely different answers below — a mark in the margin, a named
 * state, and a row that is visibly unfinished — rather than one idea at three
 * sizes. Every surface, hairline, radius and step of type is a DESIGN.md token;
 * no new colour is introduced, because the palette forbids a second accent.
 */

interface Row {
  name: string;
  title: string;
  isDraft: boolean;
}

const ROWS: Row[] = [
  {
    name: "How classical physics connects to economics",
    title: "On borrowed metaphors",
    isDraft: false,
  },
  {
    name: "Where the mechanics metaphor finally breaks",
    title: "Equilibrium is not a law",
    isDraft: true,
  },
  {
    name: "Why the Sphere is drawn and not listed",
    title: "Against the résumé",
    isDraft: false,
  },
];

/** The Dossier card the rows sit in, so each direction is judged in context. */
function Dossier({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-hairline bg-surface-1 w-[372px] max-w-full rounded-lg border p-6">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        ATOM
      </p>
      <h2 className="text-ink mt-2 text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
        Classical physics
      </h2>
      <p className="bg-surface-2 text-ink-muted mt-2 inline-block rounded-full px-2 py-0.5 text-xs">
        900 hrs
      </p>

      <p className="text-ink-tertiary mt-8 text-[13px] font-medium tracking-[0.4px]">
        {title}
      </p>
      <div className="mt-2 flex flex-col">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A — the triangle in the margin                                      */
/* ------------------------------------------------------------------ */

/**
 * A hollow triangle in a gutter to the left of every row. Published rows leave
 * the gutter empty, so the list keeps one straight edge and the drafts break
 * it. The mark is pure punctuation: it says "not closed" without naming itself,
 * and it costs the row no horizontal space it was using for words.
 */
function DirectionA() {
  return (
    <Dossier title="WRITTEN ABOUT · 3">
      {ROWS.map((row) => (
        <div
          key={row.title}
          className="border-hairline flex gap-2 border-t py-3"
        >
          <span aria-hidden className="w-3 shrink-0 pt-1">
            {row.isDraft && (
              <svg viewBox="0 0 10 10" className="text-ink-subtle w-2.5">
                <path
                  d="M1 1 L9 5 L1 9 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="min-w-0">
            <span className="text-ink-muted block text-sm leading-relaxed">
              {row.name}
            </span>
            <span className="text-ink-subtle block text-xs">
              → {row.title}
              {row.isDraft && <span className="sr-only"> (draft)</span>}
            </span>
          </span>
        </div>
      ))}
    </Dossier>
  );
}

/* ------------------------------------------------------------------ */
/* B — the triangle as a named state                                   */
/* ------------------------------------------------------------------ */

/**
 * The triangle rides inside a `status-badge` pill next to the Article's title —
 * DESIGN.md already specifies that component, so this direction invents nothing.
 * It says the word "Draft" out loud, which a bare glyph cannot: the Owner never
 * has to learn what the mark means, and the state is legible at a glance in a
 * list where most rows are published.
 */
function DirectionB() {
  return (
    <Dossier title="WRITTEN ABOUT · 3">
      {ROWS.map((row) => (
        <div key={row.title} className="border-hairline border-t py-3">
          <span className="text-ink-muted block text-sm leading-relaxed">
            {row.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="text-ink-subtle truncate text-xs">
              → {row.title}
            </span>
            {row.isDraft && (
              <span className="bg-surface-2 text-ink-muted inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px]">
                <svg viewBox="0 0 10 10" aria-hidden className="w-2">
                  <path
                    d="M1 1 L9 5 L1 9 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
                Draft
              </span>
            )}
          </span>
        </div>
      ))}
    </Dossier>
  );
}

/* ------------------------------------------------------------------ */
/* C — the row itself is unfinished                                    */
/* ------------------------------------------------------------------ */

/**
 * No badge and no gutter: the triangle is a notch cut out of the row's own left
 * edge, and the draft's rule is dashed rather than solid. The row *looks*
 * unfinished instead of being labelled as unfinished — the state is carried by
 * the shape of the thing, so it survives being skimmed, and nothing is added
 * beside the words. The riskiest of the three: it is the least explicit.
 */
function DirectionC() {
  return (
    <Dossier title="WRITTEN ABOUT · 3">
      {ROWS.map((row) => (
        <div
          key={row.title}
          className={`relative py-3 ${
            row.isDraft
              ? "border-hairline-strong border-t border-dashed"
              : "border-hairline border-t"
          }`}
        >
          {row.isDraft && (
            <span
              aria-hidden
              className="absolute -top-px -left-3 h-0 w-0"
              style={{
                borderTop: "7px solid var(--color-hairline-strong)",
                borderLeft: "7px solid transparent",
              }}
            />
          )}
          <span
            className={`block text-sm leading-relaxed ${
              row.isDraft ? "text-ink-subtle italic" : "text-ink-muted"
            }`}
          >
            {row.name}
          </span>
          <span className="text-ink-subtle block text-xs">
            → {row.title}
            {row.isDraft && <span className="sr-only"> (draft)</span>}
          </span>
        </div>
      ))}
    </Dossier>
  );
}

const DIRECTIONS = [
  {
    key: "A",
    title: "A — Mark in the margin",
    blurb:
      "A hollow triangle in a gutter left of the row. Published rows leave it empty, so the drafts break an otherwise straight edge. Pure punctuation: no word, no chrome, no space taken from the text.",
    node: <DirectionA />,
  },
  {
    key: "B",
    title: "B — Named state",
    blurb:
      "The triangle rides in a Draft pill beside the Article title, using the status-badge component DESIGN.md already specifies. Says the state out loud, so nothing has to be learned.",
    node: <DirectionB />,
  },
  {
    key: "C",
    title: "C — The row is visibly unfinished",
    blurb:
      "The triangle is a notch cut from the row's own corner, its rule dashed and its text set back. The row looks unfinished rather than being labelled unfinished. Least explicit, most quiet.",
    node: <DirectionC />,
  },
];

export default function DraftMarkerPrototypes() {
  return (
    <main className="bg-canvas min-h-dvh px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ADR-0004 PROTOTYPE ROUND · ISSUE #28
        </p>
        <h1 className="text-ink mt-2 text-[40px] leading-[1.15] font-semibold tracking-[-1px]">
          Marking a draft in an Atom&rsquo;s Dossier
        </h1>
        <p className="text-ink-subtle mt-3 max-w-2xl text-base leading-relaxed">
          Bonding an Article to an Atom now happens the moment writing starts, so
          the Dossier&rsquo;s list holds drafts alongside published Articles.
          Only the Owner ever sees the drafts. Each direction below shows the
          same three rows — the middle one is the draft.
        </p>
        <p className="text-ink-tertiary mt-2 text-xs">
          Throwaway, per ADR-0004. This route is deleted once a direction is
          chosen.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          {DIRECTIONS.map((direction) => (
            <section key={direction.key}>
              <h2 className="text-ink text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
                {direction.title}
              </h2>
              <p className="text-ink-subtle mt-2 mb-5 text-sm leading-relaxed">
                {direction.blurb}
              </p>
              {direction.node}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

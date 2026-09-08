/**
 * The marker on an Article that has not been published — round 1 of the
 * ADR-0004 prototypes chose the named state over a gutter glyph or a notched
 * corner, because the two silent markers both needed explaining and this one
 * says what it is.
 *
 * A `status-badge` per `DESIGN.md`, filled lavender rather than `surface-2`:
 * `{colors.primary-hover}` #828fff is the "in progress" colour everywhere on
 * this site, and the one every Atom's moons are drawn in.
 *
 * The label is `canvas`, not white. White on #828fff measures 2.9:1 and fails
 * WCAG AA at any size; `canvas` on it measures 7.3:1.
 */
export function DraftBadge() {
  return (
    <span className="bg-primary-hover text-canvas inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] leading-[1.35] font-medium">
      <span aria-hidden>▶</span>
      Draft
    </span>
  );
}

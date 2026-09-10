# ADR-0010: Rank comes from the Articles written about an Atom

- **Status**: Accepted
- **Date**: 2026-08-26
- **Amends**: ADR-0003 (Rank drives orbit depth; angular position is auto
  force-directed)

## Context

ADR-0003 opens "An Atom's Rank (from time spent) determines both its size and
its orbit depth". The rank-drives-layout half of that has held up. The
parenthesis has not.

`hours_spent` was a number the Owner typed into the Atom form. Nothing else in
the site ever read it, nothing could contradict it, and it went stale the moment
it was entered — an Atom's hours only changed when the Owner remembered to go
back and change them. It was the *only* thing an Atom's weight was bought with,
so the biggest, most central Atom on the Sphere was whichever one the Owner had
most recently claimed the most hours for.

Since #26 and #28 the site records something better: Articles, bonded to the
Atoms they draw on. An Atom that has been written about three times has earned
its size in a way a reader can follow — they can open the writing. Nothing has
to be maintained by hand, because the count moves as a side effect of doing the
work the site exists to show.

## Decision

**Rank is derived from the number of live, published Articles bonded to an
Atom.** `hours_spent` is dropped outright — no successor column, nothing
migrated into one, no manual weight field in its place.

The rest of ADR-0003 stands unchanged: Rank still sets size and orbit depth,
angular position is still force-directed off Connection Strength, and the Owner
still never drags an Atom into place.

Three things that fall out of it, each decided rather than inherited:

1. **The log curve stays.** `log1p(count) / log1p(mostCount)`. It was chosen so
   one towering Atom stops setting the scale for everyone below it, and that
   reason does not depend on whether the unit is hours or Articles.
2. **Only published Articles count, for the Owner as much as for a Visitor.**
   #28 recorded that a bonded count differs by who is looking, because the Owner
   can read their own drafts. That is fine for a number in a panel and not fine
   here: moons *and* Rank hang off this count, so a reader-dependent one would
   resize Atoms and resettle the whole layout the moment the Owner signed in,
   leaving them tuning a Sphere no Visitor ever sees. A draft has not been
   written about yet in any sense a reader can check.
3. **An Atom's moons count the same number.** One signal drives size, orbit
   depth and moons together, so the Sphere stays self-consistent: the
   most-written-about Atom is the biggest, the nearest the centre, and the one
   with the most moons.

The Sphere store does not read Bondings — those belong to the Article store
under ADR-0007 — so it is *handed* the count, and the component layer is what
joins the two.

## Considered options

- **Rank from Connection count**, with moons from Articles. Two independent
  signals, and arguably a truer reading of "how central is this to what I know".
  Rejected: it makes an Atom's size a function of how many lines the Owner has
  drawn, which is the same unfalsifiable, hand-maintained number as hours with
  an extra step; and it splits size from moons, so the Sphere would say two
  things at once with no way to tell which.
- **A hand-set 0–10 weight field.** Rejected for being the thing this ADR
  removes, renamed and rescaled.
- **Keep `hours_spent` alongside**, using Articles only for moons. Rejected: two
  competing sources for an Atom's weight is worse than either, and a column
  nothing reads is a column that quietly rots.

## Consequences

- **An Atom's size now changes from a different page.** Publishing an Article on
  `/articles` resizes Atoms on the Sphere and resettles the layout around them.
  That coupling is real and is the price of the decision; it is why the count is
  pushed into the Sphere store rather than fetched by it.
- **A Sphere nobody has written about yet reads flat** — every Atom the same
  size, out on the shell, with no moons. No floor was invented to avoid it: it
  is the honest rendering of "nothing is written yet", and it was already the
  behaviour when every Atom sat at zero hours.
- **Rank can no longer be edited.** The Atom form has a label, a description and
  a Learning State, and nothing that sets the Atom's weight. The only way to
  raise an Atom's Rank is to write about it.
- **The Dossier lost its `900 hrs` badge** and gained nothing in its place. The
  Atom already carries its moons, and "WRITTEN ABOUT · N" is already in the
  panel; a third rendering of the same number is not a reading.
- **The Dossier's "WRITTEN ABOUT · N" and an Atom's moons can disagree on the
  Owner's screen**, because that list includes their drafts and the moons do
  not. That is correct, and it is the visible edge of decision 2 above.
- Earlier migrations still describe Rank as coming from `hours_spent` in their
  comments. They are left as they were: an applied migration is a record of what
  happened, not a document to keep current.

# ADR-0012: A day is read on its own page

- **Status**: Accepted
- **Date**: 2026-09-15
- **Amends**: ADR-0011 (the last bullet of its Consequences)
- **Upholds**: ADR-0004 (the Ledger stays the direction the Owner chose)
- **Upholds**: ADR-0008 (a draft day is still nobody's but the Owner's)

## Context

ADR-0011 closed with this, and it was meant to stop a later reader from undoing
a decision they had not seen the argument for:

> **The Ledger's cost is a design position, not a defect.** A long day is a
> two-line stub until it is opened.

The position was right and the mechanism was wrong, and the two got recorded as
one thing. What the ADR-0004 round on #35 actually chose was **the Ledger**: a
fixed date column in tabular figures, no cards, one hairline rule, years marked
and sticky. What it did not choose — because it was never one of the three
prototypes — was *how the rest of a day gets read*. That was decided later, in
the component, by reaching for a disclosure toggle.

Read as a Visitor, the toggle is the whole experience of the Daylog, and it is
bad in four separate ways:

1. **There is nothing to click.** The row reads as one object and only a 34-pixel
   word at the end of it does anything.
2. **Opening moves the page.** The row expands in place and every day below it
   jumps down, so reading the second day of a log means finding your place again.
3. **A day has no address.** It cannot be linked to, sent to anyone, bookmarked,
   opened in a new tab, or returned to by the back button — and the one thing a
   work log is *for* is pointing at the day you did the thing.
4. **The preview is not the writing.** `excerptOf` flattens a document to a
   string, so a day whose first two lines are a heading and a code block previews
   as two lines of prose that appear nowhere in it.

None of that is the cost of a scannable column. It is the cost of having made
one surface do both jobs.

## Decision

**A Daylog Entry is read on its own page, at `/projects/<id>/log/<entryId>`,
laid out the way an Article is read.** The Ledger row is a link to it.

The day stands where an Article's title stands, because a Daylog Entry has no
title and the date is its heading (#35, decision 11). The body is the same
`ArticleBodyView` an Article gets, so a picture is a picture and a code block is
a code block. Under it, the day before and the day after — a Daylog is read in
sequence, and the way on from a day is the next day, not the list.

**The Ledger is unchanged in everything the prototype round decided**, and the
two-line clamp stays. What changes is only that the clamp is no longer a cost to
be defended: scanning and reading are different jobs, and they now happen on
different surfaces. The whole row is the link rather than a control at the end of
it, and the Owner's per-row controls sit outside that link — a button inside an
anchor is neither valid nor clickable in the way either of them promises.

**This did not need a new ADR-0004 round.** The deliverable is a reading page
whose look is the Article page's, which `DESIGN.md` and an existing, agreed
surface fully determine; the Ledger — the thing the Owner actually picked between
three directions for — is not being redesigned. A round here would have been
three prototypes of a decision already made.

## Consequences

- **The read rule now has to hold against an address.** `entries()` was only
  ever called with a Project the caller had already found, so it never had to
  ask whether that Project was readable. A day's URL names no Project, so
  `getEntry` checks both ends: the day must be published or the reader must be
  the Owner, *and* the Project must not be in the Trash. There is a test for
  each half, and each was confirmed to fail when that half is removed.
- **`getProject` was quietly wrong and is now right.** It documented the rule
  `projects()` applies and did not apply it. Nothing noticed, because every
  caller was a test. The day's page names its Project on screen, so the gap was
  closed rather than worked around.
- **Prev/next is read through the store, not the array.** A Visitor stepping
  through a log is never offered a link to one of the Owner's drafts, because
  the neighbours come from `entries()` — the same rule that decides the Ledger.
  A link to a refusal would be ADR-0008's failure with an extra click in front
  of it.
- **The last bullet of ADR-0011's Consequences no longer holds** and should be
  read through this ADR. A long day is a two-line stub *in the Ledger*, which is
  a summary, and the full day is one click away at a URL of its own.
- **Two surfaces render a day now.** The Ledger renders the excerpt and the
  page renders the document. They cannot disagree about what a day *is* — both
  take the stored body — but they can disagree about what it looks like, and the
  page is the one that is right.

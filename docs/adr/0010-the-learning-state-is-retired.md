# ADR-0010: The Learning State is retired

- **Status**: Accepted
- **Date**: 2026-08-30
- **Supersedes**: the Learning State introduced with issue #21
- **Departs from**: issue #30, which recorded that "Learning State is untouched"

## Context

An Atom carried a **Learning State** — `ongoing` or `learned` — set by the Owner
in the Atom editor. It had exactly one rendering: the colour of the Atom's
moons, lavender while a topic was still being worked through, green once it was
finished. `SphereLegend` existed to explain that colour, because a colour cannot
explain itself.

Issue #30 removed `hours_spent` on the grounds that it was "a number the Owner
types into a form and nothing else in the site ever checks — unfalsifiable, stale
the moment it is entered, saying nothing a reader can follow". That ticket
explicitly exempted the Learning State: *"It was never Rank and is not affected."*

That exemption does not survive contact with its own argument. The Learning
State is the same kind of value: **a claim the Owner sets by hand, that nothing
verifies, that goes stale silently.** It is worse in one respect. `hours_spent`
at least only ever grew. A Learning State asks a question the Sphere cannot
honestly answer — nobody is finished with TypeScript — and marking an Atom
`learned` makes a claim the Owner would have to keep maintaining across every
Atom forever, or let rot in public.

The rot is invisible, too. A stale hours figure was at least visible as a number
in the Dossier. A stale Learning State is a green dot a few pixels across, and
nothing on the screen ever prompts a re-read.

## Decision

**The Learning State is removed outright — the column, the field, the editor
input, the moon-colour rule and the legend's key.**

- `atoms.learning_state` is dropped. Not nullable, not defaulted, no successor
  column, nothing backfilled.
- `LearningState`, `DEFAULT_LEARNING_STATE` and `toLearningState` leave
  `src/sphere/domain.ts`. **`SettledAtomDraft` goes with them**: it existed only
  because the state was optional on the way in and required on the Atom, so
  something had to settle it before a write. Nothing is left open, so `AtomDraft`
  is now simply `Omit<Atom, "id">` and the store hands the repository exactly
  what the form gave it.
- **Every moon is `primary-hover` lavender.** A moon says one thing now, and it
  says it by being there: the count is the whole reading.
- `SphereLegend` **survives**, minus its two colour swatches. Issue #30 gave it a
  second line — "One per Article written about the Atom" — and that reading is
  the one nobody can guess: moons are visibly countable, but nothing on the
  screen says what the count is *of*.

**Where the account of learning goes instead: the Project Daylog.** This is the
half of the decision that makes it a removal rather than a loss. "Am I done with
this?" was always the wrong question to ask of a topic. "What did I work through,
and when" is answerable, dated, and written rather than toggled — and it is
evidence, in the same sense a bonded Article is evidence under #30.

## Consequences

- **Green leaves the Sphere.** `semantic-success` (#27a644) was the palette's one
  chromatic colour outside lavender, and the moons were its only use on the
  Sphere. `DESIGN.md` still defines the token, and it is now unused there — which
  is the honest state, not an omission to fix.
- **An Atom is down to a label and a description.** Two fields have now been
  taken off it in consecutive changes, both for the same reason. `atom-crud.test.ts`
  gained a shape assertion — *"What an Atom carries"* — so a third one cannot
  arrive quietly.
- **A judgement the Owner had made is discarded, not migrated.** Any Atom marked
  `learned` loses that mark permanently. There is nowhere to put it that would
  not reintroduce the problem, and a Daylog Entry is written, not converted.
- **This contradicts issue #30's stated scope in writing.** It is recorded here
  rather than left for a future reader to discover as a silent reversal: #30 was
  right about its own ticket boundary and wrong about the exemption lasting.
- **The moons' colour is now free.** If the Sphere ever needs to say a second
  thing about an Atom, colour is available — and whatever claims it should have
  to answer the objection this ADR makes, not merely be a different property.

# ADR-0011: A Project is public once a day of it is, and a Bonding is one word over two tables

- **Status**: Accepted
- **Date**: 2026-08-30
- **Upholds**: ADR-0007 (Bondings live with the thing they are about)
- **Extends**: ADR-0008 (writing is drafted, then published)
- **Inherits**: ADR-0009 (writing is desktop-only)

## Context

Issue #35 adds a second place to write. An **Article** is an argument: drafted,
shaped, published deliberately, bonded to the Atoms it draws on, and — since
#30 — the thing that gives an Atom its Rank. A **Daylog Entry** is the day you
found out that RLS has to reach through the join. It is raw by nature, it is
worth keeping, and it is not an Article.

Three questions had no obvious answer, and each had a plausible alternative that
was rejected for a specific reason.

## Decision 1: a Project's visibility is derived, never stored

**A Project reaches a Visitor only once it has one live, published Daylog Entry
in it.** There is no `published_at` on `projects`.

The obvious design is a flag: a Project is private until the Owner publishes it.
It was rejected because a flag is a *second* answer to a question the Entries
already answer, and two answers drift. Unpublish the only published day and the
flag still says public. Trash the Project's last Entry and the flag still says
public. Every one of those is a bug that ships silently, because nothing on the
screen contradicts it.

Deriving it means the reverse is free and cannot be forgotten: deleting the last
published day withdraws the Project, and there is nothing to correct. There is a
test for exactly that, because the whole argument for the design is that it
holds without anyone maintaining it.

The same argument settles **"last logged"**, which is the date the Projects list
sorts by. Derived from published Entries at read time; no column. This is #30's
case against `hours_spent` — a stored value nothing verifies, going stale in
public — applied *before* the column exists rather than after.

One consequence, stated plainly: the derived date counts **published Entries
only, for the Owner too**. A draft dated later must not move it. If it did, the
Projects list would reorder the moment the Owner signed in, and they would be
tuning a list no Visitor ever sees. That is the line #30's decision 3 drew for
moons and Rank, and this stays on the right side of it.

**A Project with nothing published sorts first for the Owner.** It has no date,
and the absence is information: it is the work actually in progress. A Visitor
never sees one, so this branch never reorders their list.

## Decision 2: one Bonding in the language, two tables underneath

`CONTEXT.md` now defines a **Bonding** as a link between an Atom and a piece of
the Owner's work — an Article or a Project. One word, one mental model.

Underneath, `bondings` is untouched and `project_bondings` is new. The
alternative — a single table with nullable `article_id` and `project_id` and a
check that exactly one is set — was rejected on one concrete cost:

**The Name rule differs by target.** An Article's Bonding must say how the Atom
feeds the argument; `bondings.name` is `not null` with a non-blank check, and
that is where the #26 invariant actually lives. A Project's Name is optional —
the work touched the topic, and a sentence per link is Article-grade ceremony on
a log. In one table that becomes a *conditional* constraint, which is to say the
invariant moves out of the database and into application code, where nothing
enforces it.

What the polymorphic table would have bought is a query nobody writes. No caller
wants "all Bondings regardless of target": the Dossier renders two lists, and
#30's moon count **must** filter to Article-bondings or the Sphere silently
changes shape. Two rules want two tables.

**ADR-0007 is upheld, not reopened.** Each store owns the Bondings of the thing
it is about, and the page does the join — the arrangement ADR-0007 chose, now
applied twice. Its rejected option, a neutral store knowing neither end, is
still rejected for the reason it gave.

There is deliberately **no union type** in code today. Nothing consumes both
kinds together, so a `Bonding = ArticleBonding | ProjectBonding` alias would be
a type with no reader. The unification that matters is the language, and that is
in `CONTEXT.md`. If a consumer ever wants both at once, that is when the type
earns its place.

## Decision 3: a Project does not feed Rank

**Moons and Rank still count live, published, bonded Articles, and nothing
else.** A Project bonded to an Atom is a row in that Atom's Dossier — "WORKED
ON · N" — and has no other effect.

The tempting version is that work counts too. It was rejected because #30 left
the Sphere with exactly one signal driving size, orbit depth and moons, and the
reason it gave was that the signal has to be *evidence a reader can follow*. An
Article about an Atom is a public argument anyone can check. A day of work is a
record that the Owner was busy. Letting the second inflate an Atom reimports the
unfalsifiable-number problem #30 spent a whole ticket removing, in a new unit.

This is also what makes the Dossier's reader-dependent Project list safe. "WORKED
ON · N" differs by who is looking, as "WRITTEN ABOUT · N" already does — but
because no Project touches the geometry, **the Sphere's Atom sizes and orbit
radii are identical signed in or out.** That is the property #30's decision 3
protected, and it survives here for free rather than by care.

## Consequences

- **The Sphere page now mounts a third store.** ADR-0007 set the precedent —
  each page loads what it needs, in parallel, neither blocking — and this is a
  third parallel load on the landing page. It is worth saying out loud, and it
  is bounded by decision 3: none of it feeds the geometry, so the Sphere never
  waits on it.
- **The visibility rule is enforced twice, on purpose.** RLS refuses the rows,
  and the store applies the same rule to whatever arrives. The browser tests
  stub Supabase and hand every row to everyone, so they exercise the near side —
  which is the side a client bug can break.
- **Writing a Daylog Entry is desktop-only**, inherited from ADR-0009 by reusing
  the writing surface rather than decided afresh. That constraint bites harder
  on a *daily* log than it did on Articles, and it was accepted knowingly. If it
  bites in practice, ADR-0009 is the ADR to supersede — the fix is not to
  special-case this page.
- **A day is deleted outright.** The Trash protects a Project, which is months
  of work; a second Trash holding single days is machinery nobody opens. The
  two-step confirm is what makes it safe.
- **`entry_date` is a `date` with no unique constraint.** Two Entries may share
  a day — you write in the morning and learn something else at night — so
  `created_at` exists purely to break that tie when the Ledger is ordered.
- **The Ledger's cost is a design position, not a defect.** A long day is a
  two-line stub until it is opened. That is what the direction bought: a log
  that stays scannable at two hundred entries. It is recorded in the component
  and in #35 so it is not "fixed" later by someone who did not see the round.

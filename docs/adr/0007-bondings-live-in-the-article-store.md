# ADR-0007: Bondings live in the Article store, and the join is the page's

- **Status**: Accepted
- **Date**: 2026-08-03

## Context

Issue #26 adds the Bonding: a link from an Article to an Atom carrying a Name
that explains how that Atom feeds into that Article. It is read from both ends —
an Atom's Dossier lists the Articles bonded to it, and an Article lists the Atoms
it draws on.

That is a problem, because the two ends live in different stores. ADR-0006 put
Articles in their own store precisely to keep them out of the Sphere store, which
was already the largest thing in the codebase. A Bonding spans both, so whichever
store holds it does not hold half of what a rendered Bonding row needs: the
Article store knows no Atom labels, and the Sphere store knows no Article titles.

Three options were on the table: fold Bondings into the Sphere store, give them a
third store of their own, or pick one of the two existing stores and let the page
do the join.

## Decision

**Bondings live in the Article store, and the page joins them to Atoms.**

- The Article store owns `bondings`, `addBonding`, `deleteBonding`, and both
  reads: `bondingsForArticle` (Article → Atoms, returning raw Bondings) and
  `bondedArticles` (Atom → Articles, returning each Bonding with its Article).
- The Article store is the one that holds them because a Bonding is created from
  the Article editor and an Article is its subject. Folding them into the Sphere
  store would have grown the store ADR-0006 was written to stop growing.
- `bondedArticles` returns the Article, because the Article store has it.
  `bondingsForArticle` returns Atom **ids**, because it does not — the Article
  page reads the label off the Sphere store itself.
- Both pages therefore load both stores. The Articles page mounts `useSphere`
  for Atom labels; the Sphere page mounts `useArticles` for the Dossier's list.

A Bonding to a trashed Article is not readable. `bondedArticles` goes through
`getArticle`, which already excludes the Trash, and the RLS policy on `bondings`
filters on the Article's `deleted_at` so a Visitor never receives the row at all
— the same two-sided rule ADR-0006 set for Articles themselves.

## Consequences

- Each page now issues two loads rather than one. They are independent and
  parallel, and neither blocks rendering, but it is two round trips where a
  single joined store would have made one.
- The join is written twice — once in the Article page, once in the Dossier —
  because each direction needs a different half. Neither is business logic: both
  are a `map` from an id to a label the other store already holds.
- A third store for Bondings alone was rejected as the worst of both: it would
  have known neither end, so *every* consumer would join two stores instead of
  one.
- Atom deletion cascades Bondings away in the database, but the Article store
  does not hear about it. Until the next load an Article page can hold a Bonding
  whose Atom is gone; it filters those rows out rather than rendering a link to
  nothing. If that staleness ever becomes visible in practice, the honest fix is
  for the Sphere store to tell the Article store an Atom went — not for the two
  to be merged.

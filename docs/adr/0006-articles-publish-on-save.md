# ADR-0006: Articles publish on save, and delete to a Trash

- **Status**: Accepted
- **Date**: 2026-08-02

## Context

Issue #25 adds an Articles page: the Owner writes, Visitors read. The obvious
shape for that is the one every CMS has — a draft state, a publish button, and
a separate editing surface to manage them from.

That would be the first thing on this site to work that way. Atoms and
Connections are edited in place, on the same screen a Visitor sees, and the
change is live the moment it saves; there is no draft Atom and no dashboard.
`CONTEXT.md` says as much in the Edit Mode entry, and the Sphere store has no
concept of unpublished data.

Deleting is the other half of the question. `deleteAtom` removes the row and
cascades, which is right for an Atom — it is a data point, and the Owner can
retype it. An Article is writing. Losing one to a mis-click is not the same
kind of loss, and the two-step confirm `AtomEditor` uses is protection against
the click, not against changing your mind an hour later.

## Decision

**An Article publishes the moment it is saved, and deleting one moves it to a
Trash rather than removing it.**

- No draft/publish step. `addArticle` and `editArticle` are live writes, exactly
  like `addAtom` and `editAtom`. The Owner edits in place and Visitors see it.
- `deleteArticle` stamps `deleted_at` — the Trash. The Article leaves the public
  list at once and stops being readable by id.
- The Trash is the Owner's alone. The RLS policy filters `deleted_at is null`
  for anonymous readers, so a trashed Article is never sent to a Visitor rather
  than merely hidden by the client.
- `restoreArticle` puts it back. `destroyArticle` removes the row for good and
  is a deliberately separate, explicitly-labelled action.

Articles get their own store and repository (`src/articles/`) rather than
joining the Sphere store. They share the `AuthProvider` and the store shape, but
nothing else: an Article has no Rank, no position and no Connections, and the
Sphere store is already the largest thing in the codebase.

## Consequences

- The Owner cannot work on an Article privately before it goes live. If that
  turns out to matter, the honest fix is a draft state on the Article — not a
  publish button bolted onto everything.
- Two stores now restore the same Supabase session independently. They agree,
  because the session is the browser's, but it is two subscriptions where one
  would do.
- The Owner signs in on the Sphere. The Articles page picks that session up; it
  has no sign-in form of its own.
- Soft delete means "deleted" is now a state the data model carries, and every
  read path has to say which side of it it wants. `articles()` and `trash()` are
  that choice made explicit rather than a flag threaded through call sites.

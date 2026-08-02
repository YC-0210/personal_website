# ADR-0006: Articles are persisted in Supabase and live-edited, not stored as files

- **Status**: Accepted
- **Date**: 2026-08-02

## Context

Adding an Articles page raised the obvious question of where the writing
lives. Files (Markdown/MDX in the repo) are the default choice for long-form
content: they're portable, versioned in git for free, and can be authored in
a real editor instead of a web form.

But this app's whole Owner workflow — Atoms, Connections — is built around
Edit Mode: sign in, edit directly on the page the Visitor sees, and the
change is live immediately. There is deliberately no separate draft/publish
step (see the Edit Mode entry in `CONTEXT.md`). Storing Articles as files
would mean the Owner has two different mental models for publishing on their
own site: click-to-edit for the Sphere, git-push-to-deploy for everything
they write about it.

## Decision

**Articles are a Supabase table, edited live in Edit Mode, the same pattern
as Atoms and Connections.** `SphereRepository`'s pattern — the store never
talks to Supabase directly — extends to Articles rather than introducing a
second persistence mechanism.

The cost this trades away is real: files would have given free git history,
diff review, and offline authoring, none of which a database row has by
default. That surfaced directly as a concern (data loss on delete, with no
way to recover a previous version) — mitigated narrowly, not by adding
version history, but by making Article deletion recoverable: a delete marks
the row for the Trash instead of removing it, with permanent deletion a
separate, explicit, later action.

## Consequences

- Article reads/writes go through the same `SphereRepository`-shaped seam
  Atoms and Connections already use, rather than a filesystem/MDX read path.
- Articles have no edit history. Overwriting a paragraph with a worse draft
  is not recoverable the way a `git revert` would be — only outright
  deletion is protected, via the Trash.
- Long-form authoring happens in whatever in-browser editor Edit Mode's
  Article form provides, not in the Owner's own editor of choice.

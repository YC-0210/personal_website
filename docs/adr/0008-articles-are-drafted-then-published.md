# ADR-0008: An Article is drafted, then published

- **Status**: Accepted
- **Date**: 2026-08-10
- **Amends**: ADR-0006 (Articles publish on save, and delete to a Trash)

## Context

ADR-0006 decided that an Article publishes the moment it is saved, and it was
right for what existed then. The editor was a `<textarea>` in the same modal
shell the Atom and Connection forms use. Saving was a deliberate act the Owner
performed once, at the end, on a piece of writing they had already finished
somewhere else. Publish-on-save cost nothing, and it kept the site's one rule —
edit in place, changes are live — unbroken.

Issue #28 replaces that editor with a full-page writing surface, and the thing
that breaks the rule is not the page. It is **autosave**.

Autosave is most of why Medium is safe to write in: you do not lose an hour's
work to a closed tab, and you never think about saving at all. But an autosave
under ADR-0006 publishes. Every keystroke's worth of a half-formed argument
would be live on `/articles` the moment the debounce fired, in front of anyone
reading. The failure this ticket exists to reduce — losing writing — would have
been traded for a worse one.

Two cheaper answers were considered and rejected:

- **No autosave.** Keeps ADR-0006 intact and reintroduces exactly the loss the
  full-page surface is meant to prevent.
- **Autosave to `localStorage`.** A draft that lives in one browser, does not
  survive a cache clear, and is invisible from another device. That is not a
  draft, it is a cache.

ADR-0006 anticipated this in its own Consequences: *"The Owner cannot work on an
Article privately before it goes live. If that turns out to matter, the honest
fix is a draft state on the Article — not a publish button bolted onto
everything."* A long-form writing surface is the condition under which it turns
out to matter.

## Decision

**An Article is written as a draft and published by a separate, deliberate
act.**

- `published_at` is null while the Article is a draft. Publishing stamps it.
- **Autosave calls `editArticle`, which cannot change published-ness.** A draft
  stays a draft however many times it is saved; a published Article stays
  published while it is being revised. This is the invariant the whole ADR is
  for, and it is held in the store rather than in the editor.
- `publishArticle` is its own store operation and its own repository call, for
  the same reason `destroyArticle` is separate from `deleteArticle`: the act
  that cannot be undone quietly gets its own name.
- **RLS is the enforcement.** A draft is refused to an anonymous reader by the
  database, not filtered out by the client — the same two-sided rule the Trash
  already has. The `bondings` policy extends it through the join to the parent
  Article, or an Atom's end would leak a private Article's existence and its
  Bonding Name while the Article itself was refused.
- The Bonding is created **with the draft**, not at publish (issue #28,
  decision 6). An "intended Atom" converted later would be a second, parallel
  concept that skips the required-Name invariant from #26 and adds a step that
  can fail. What hides a draft's bond is the read rule, not its absence.

## Consequences

- **`deleted_at` and `published_at` are two independent axes.** An Article can
  be a draft in the Trash, or a published Article in the Trash. ADR-0006 already
  observed that soft delete forces every read path to say which side of it it
  wants; there are now two such questions, and `articles()`, `getArticle()` and
  `trash()` each answer both rather than leaving one implied.
- **`bondedArticles()` inherits the rule** by going through `getArticle()`,
  which is what keeps a draft's Bonding off a Visitor's Dossier without a second
  filter to keep in step.
- **"WRITTEN ABOUT · N" now differs by who is looking.** The Owner's count
  includes drafts; a Visitor's does not. This is already true of the Trash, so
  it is consistent — but the count is no longer an objective fact about an Atom,
  and it is worth saying so out loud.
- **The site's edit-in-place rule now has one documented exception.** Atoms and
  Connections are still live the moment they save; `CONTEXT.md`'s Edit Mode
  entry is amended to say that Articles alone carry a draft state, and why.
  Writing is the one thing on this site that is not finished when it is saved.
- An Article created from an Atom starts as `Untitled`, because the draft has to
  exist before the typing does — the editor is always `/articles/<id>/edit` and
  there is no route that holds unsaved text.

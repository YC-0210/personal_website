# ADR-0009: Writing an Article is desktop-only

- **Status**: Accepted
- **Date**: 2026-08-10
- **Narrows**: issue #20 (mobile-accessibility parity)

## Context

Issue #20 established that this site works on a phone as well as it works on a
desktop — not a cut-down version, the same site. The Dossier splits into the
Compact Bar rather than disappearing; every Owner control is reachable; the
Sphere stays orbitable. That parity is a rule, and rules that get quietly
excepted stop being rules.

Issue #28 adds a full-page writing surface. Two things about it do not survive
the move to a phone:

- **The formatting controls are driven by text selection.** Selecting text on a
  phone raises the OS's own Copy / Paste / Look Up menu, in the same place, over
  the same words. Two menus compete for one gesture and the OS wins.
- **The keyboard takes half the viewport.** What is left is a strip a few lines
  tall, and long-form writing in a few lines is not the activity.

The Notion/Bear answer — a fixed toolbar pinned above the keyboard — was
considered and rejected. It is real work, and it is real work in service of an
activity the Owner does not do on a phone. They write at a desk.

## Decision

**The editor does not open on a phone. Reading an Article and publishing a draft
both still do.**

- `/articles/<id>/edit` renders, on a small viewport, a page that *says* writing
  is desktop-only and why. It does not 404, and it does not render an editor
  that then fails to work.
- That page still offers the two things a phone can do usefully: read the
  Article, and publish it if it is ready. A draft finished on a laptop can be
  published from a bus stop.
- This is recorded as a **deliberate narrowing of #20, not an oversight.**
  Anything else on this site that a phone cannot do is a bug until an ADR says
  otherwise.

## Consequences

- The parity rule from #20 now reads "every *reading* surface, and every Owner
  control except the writing surface". That is a weaker sentence, and the cost
  of this decision is that it has to be checked against every future feature
  rather than assumed.
- A phone can reach a URL a phone cannot use. Saying so on the page is the whole
  mitigation — a silent redirect would leave the Owner wondering whether the
  draft had been lost.
- If the Owner ever does want to write on a phone, this is the ADR to supersede,
  and the toolbar-above-the-keyboard pattern is the rejected alternative to
  reopen. The decision is about what the Owner does, not about what is possible.

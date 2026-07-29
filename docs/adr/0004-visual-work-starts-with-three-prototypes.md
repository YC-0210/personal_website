# ADR-0004: Visual work starts with three prototypes

- **Status**: Accepted
- **Date**: 2026-07-29

## Context

The first visual work on this repo — the Atom nodes and the Owner sign-in form —
was designed and shipped in one pass. The agent picked a look, wrote the real
code, verified it, and opened the PR. The Owner only saw the result once it was
already implemented and pushed.

That is the wrong order. By the time a look is in a PR it is expensive to
change: the styling is entangled with tests, screenshots and review comments,
and there is a pull toward defending the existing choice rather than exploring
better ones. It also silently hands an aesthetic decision to the agent, when
aesthetics are exactly the part the Owner has the strongest opinion about and
the agent has the least standing to decide.

The Atom appearance that came out of that first pass is a case in point — see
the follow-up issue raised to redo it.

## Decision

**Any change whose main deliverable is visual starts with three distinct
prototypes for the Owner to choose from. No production code is written until the
Owner has picked one.**

This covers new UI surfaces, changes to how Atoms or Connections are rendered,
layout and framing changes, and motion design. It does not cover work whose
visual result is fully determined by `DESIGN.md` (applying an existing token to
an existing component), or bug fixes that restore an already-agreed look.

The three prototypes must be **genuinely different directions**, not one idea at
three intensities. They should be shown in a form the Owner can actually judge:
for 3D work that means something interactive they can orbit, not a screenshot —
a static image cannot convey depth, motion or scale.

`DESIGN.md` still governs. The prototypes explore within it, and any prototype
that departs from it must say so and why.

## Consequences

- Visual tickets gain a round trip before implementation. This is the point.
- Prototypes are throwaway. They are not held to the testing standard in
  ADR-0005, and they must not be merged — only the chosen direction gets built
  properly.
- The agent must be able to publish something interactive. A hosted preview
  page is the established way to do this here.
- If the Owner dislikes all three, that is a successful outcome: it cost three
  prototypes instead of a built, tested and reviewed feature.

# Seeds

Throwaway data for checks that cannot be made from the agent sandbox. These are
not migrations — nothing here should ever run against the real Sphere except
deliberately, by the Owner, with the teardown to hand.

## `perf-50-atoms.sql` — the issue #22 frame-rate check

The sandbox is software-rendered, so two performance claims have never been
tested where it counts:

- #14's "~50 Atoms with no visible frame drop", which could not be closed out.
- PR #20's Nameplate per Atom — a DOM node that drei's `Html` repositions every
  frame, so its cost grows linearly with Atom count.

To make the check:

1. Open the Supabase SQL editor (already authenticated as the Owner) and run
   `perf-50-atoms.sql`. It adds 50 Atoms named `Perf probe NN` and 107
   Connections between them.
2. Open the production site on **a phone and a laptop** and check:
   - idle auto-rotation stays smooth, with Nameplates on;
   - orbiting, selecting, and the highlight/dim transition stay smooth with an
     Atom selected;
   - the Compact Bar → Takeover flow on mobile opens and closes without jank.
3. Run `perf-50-atoms-teardown.sql`. It deletes exactly the `Perf probe %` rows;
   their Connections cascade away with them.

Record what you measured on the ticket. If frame drops appear, the levers named
in #22 are instanced SDF text (troika `Text` with a bundled font) instead of
per-Atom DOM nodes, throttling the `Html` updates, or fading distant Nameplates
out — but file that as its own ticket with the numbers, rather than guessing at
which lever first.

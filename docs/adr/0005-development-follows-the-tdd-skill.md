# ADR-0005: Development follows the `/tdd` skill

- **Status**: Accepted
- **Date**: 2026-07-29

## Context

The walking skeleton (issue #2) was built by writing the implementation and its
tests together, then running them. Everything passed, which proved very little:
a test written after the code it tests is shaped by that code, and tends to
assert what the code already does rather than what the feature should do.

The risk is not theoretical. In issue #3 the first version of the test covering
"connected Atoms sit closer together" passed even when the attraction force was
set to zero — it used four Atoms, and four mutually-repelling points settle into
a tetrahedron where the seed order alone made the asserted pair marginally
closest. Connections could have had no effect whatsoever on the layout and the
suite would have been green. That was caught by deliberately breaking the code
to see whether the tests noticed, not by the tests themselves.

## Decision

**All development follows the `/tdd` skill.** Invoke it and follow its rules
rather than working from memory of them. In short:

- **Red before green.** Write the failing test first, then only enough code to
  pass it. Do not anticipate future tests.
- **One vertical slice at a time.** One seam, one test, one minimal
  implementation per cycle — never all the tests up front, then all the code.
- **Test at pre-agreed seams.** For this project the seam is the Sphere store's
  public API, exercised against the fake repository and fake auth provider. Not
  Three.js internals, not raw SQL, not component markup.
- **Refactoring is a separate stage**, not part of the red-green loop.

Two additions specific to this repo, both learned the hard way above:

1. **When a test passes on first run, it has not been verified.** A test that
   never failed has not demonstrated that it can fail. Either drive it red
   first, or break the production code deliberately and confirm the test
   catches it.
2. **Mutation-check before claiming a suite is meaningful.** Break each
   behaviour the suite claims to protect, one at a time, and confirm a test
   fails for each. Report survivors rather than quietly deleting the code they
   failed to cover — a survivor is either a missing test or a line that earns
   nothing.

## Consequences

- Features take more cycles to build, and the cycles are smaller.
- "Tests pass" stops being the claim. The claim is "these tests fail when the
  behaviour breaks", and that requires evidence.
- Some code is genuinely not covered by this seam: the Three.js rendering layer
  and the Owner's forms are verified manually in a browser, per the testing
  decisions in issue #1. That exemption is deliberate and bounded — it is not a
  licence to skip tests for store logic.
- Prototypes made under ADR-0004 are exempt; they are throwaway by definition.

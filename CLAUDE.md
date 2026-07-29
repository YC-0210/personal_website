## Working agreements

These two are not suggestions. Both were added after the workflow they replace
produced a real problem — the reasoning is in the ADRs.

### Test-driven development is required

**All development follows the `/tdd` skill.** Invoke the skill; don't work from
memory of it. Red before green, one vertical slice at a time, tested at the
Sphere store's public API against the fakes.

Two rules specific to this repo:

- **A test that passed on its first run has not been verified.** Drive it red
  first, or break the production code and confirm the test catches it.
- **Mutation-check before claiming a suite means anything.** Break each
  behaviour the suite claims to protect and confirm something fails. Report
  survivors; don't quietly delete the code they failed to cover.

See `docs/adr/0005-development-follows-the-tdd-skill.md`.

### Visual work starts with three prototypes

**Anything whose main deliverable is visual gets three genuinely different
prototypes for the Owner to choose from before any production code is written.**
Not one idea at three intensities.

Show them in a form the Owner can actually judge — for 3D work that means
something interactive they can orbit. A screenshot cannot convey depth, motion
or scale, so it is not an acceptable way to present 3D work for approval.

Doesn't apply to work whose look is fully determined by `DESIGN.md`, or to
fixes restoring an already-agreed look. See
`docs/adr/0004-visual-work-starts-with-three-prototypes.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `YC-0210/personal_website`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

Visual tokens live in `DESIGN.md` at the repo root — colors, the four-step
surface ladder, hairlines, radii and type. It is the source of truth for
anything with a color or a corner on it.

**ADR numbering note:** issue #1 references ADR-0001 (Next.js + react-three-fiber),
ADR-0002 (Supabase for data + auth) and ADR-0003 (rank-driven auto layout), but
those files were never committed. Numbering here starts at 0004 to leave room
for them to be written up without renumbering.

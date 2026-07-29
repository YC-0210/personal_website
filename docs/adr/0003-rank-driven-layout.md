# Rank drives orbit depth; angular position is auto force-directed

An Atom's Rank (from time spent) determines both its size and its orbit depth (radius from the Sphere's center), and its angular position is computed automatically by a force-directed layout driven by Connection Strength, rather than being manually placed by the Owner. This couples layout into the data model — moving an Atom in space is no longer a free editing action, only a consequence of editing its Rank and Connections — which is a deliberate trade: it keeps the Owner's editing surface to data only (no drag-to-position step per Atom) and guarantees the Sphere always reads as organized, at the cost of losing fine manual control over exact placement.

## Considered options

- Manual angular placement (radius still from Rank) — full creative control, but requires positioning every Atom by hand as it's added.
- Hybrid auto-layout with per-Atom pinning on drag — best of both, but adds real implementation complexity (pin state, re-layout-around-pins) for a v1 with only ~10–50 Atoms.

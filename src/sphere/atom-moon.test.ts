import { describe, expect, it } from "vitest";

import { LATTICE_CORE_SCALE, moonOrbit } from "./atom-moon";

/**
 * The Atom's moon is the chosen answer to "make Rank visible" (issue #24,
 * round three). Rings drawn *around* the Atoms were rejected because they
 * crowded the Sphere, so the whole point of this one is that it stays inside
 * the Atom. That containment is the invariant worth protecting; the rest of
 * the Lattice Atom is Three.js and is verified in a browser, per ADR-0005.
 */
describe("an Atom's moon", () => {
  const ranks = [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1];

  it("always orbits inside the shell and clear of the core", () => {
    for (const rank of ranks) {
      const { radius } = moonOrbit(rank);

      // Strictly between the core's surface and the shell's, at every Rank —
      // a moon that touches either reads as part of it rather than as motion.
      expect(radius).toBeGreaterThan(LATTICE_CORE_SCALE);
      expect(radius).toBeLessThan(1);
    }
  });

  it("orbits wider the higher the Rank", () => {
    expect(moonOrbit(0.9).radius).toBeGreaterThan(moonOrbit(0.2).radius);
  });

  it("orbits faster the higher the Rank", () => {
    expect(moonOrbit(0.9).speed).toBeGreaterThan(moonOrbit(0.2).speed);
  });

  it("keeps the lowest-Ranked Atom's moon moving rather than parked", () => {
    // A stationary dot reads as a rendering artefact, not as a low Rank.
    expect(moonOrbit(0).speed).toBeGreaterThan(0);
  });
});

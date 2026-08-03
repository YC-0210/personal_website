import { describe, expect, it } from "vitest";

import { LATTICE_CORE_SCALE, MAX_MOONS, moonCount, moonOrbit } from "./atom-moon";

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

/**
 * How many moons an Atom carries: one more for every 250 hours devoted to it.
 *
 * This is the one thing in the Sphere that reads off raw hours rather than
 * Rank. Rank is relative — it says where an Atom stands against the others, and
 * it moves when a different Atom is edited. A count of moons is absolute: four
 * moons means a thousand hours whatever else the Sphere holds, so an Atom's
 * moons only change when its own hours do.
 */
describe("how many moons an Atom carries", () => {
  it("gives every Atom one, however little time it has had", () => {
    // The moon is what makes an Atom read as alive; a new Atom is not a dead one.
    expect(moonCount(0)).toBe(1);
    expect(moonCount(249)).toBe(1);
  });

  it("adds one more for every 250 hours devoted", () => {
    expect(moonCount(250)).toBe(2);
    expect(moonCount(499)).toBe(2);
    expect(moonCount(500)).toBe(3);
    expect(moonCount(1000)).toBe(5);
  });

  it("stops adding once they could no longer be counted at a glance", () => {
    // They share one orbit inside a shell that is a few dozen pixels across.
    // Past this they overlap, and a count you cannot take is not a reading.
    expect(moonCount(10_000)).toBe(MAX_MOONS);
    expect(moonCount(Number.MAX_SAFE_INTEGER)).toBe(MAX_MOONS);
  });

  it("still draws one for hours that are missing or nonsense", () => {
    // `hours_spent` arrives as a string from Postgres and is `Number()`d; a
    // null column would make that NaN, and an Atom with no moon at all reads
    // as a rendering fault rather than as bad data.
    expect(moonCount(Number.NaN)).toBe(1);
    expect(moonCount(-500)).toBe(1);
  });
});

/**
 * The Atom's moon: a small body orbiting inside the Lattice Atom, carrying
 * Rank as something you can watch rather than a size you have to compare
 * across the scene.
 *
 * Chosen from the third ADR-0004 round on issue #24. The two earlier rounds
 * drew Rank *around* the Atom — halos, orbit rings, concentric rings — and all
 * of them crowded the Sphere, because anything outside an Atom's silhouette
 * competes with the layout. So this one is bounded by construction: the moon
 * cannot leave the shell, and the Sphere reads the same at any Atom count.
 */

/** The solid core sits at half the Atom's radius; the shell is the unit. */
export const LATTICE_CORE_SCALE = 0.5;

/** The gap the moon runs in, kept clear of both the core and the shell. */
const MIN_RADIUS = 0.62;
const MAX_RADIUS = 0.86;

/** Radians per second, at the bottom and top of the Rank range. */
const MIN_SPEED = 0.4;
const MAX_SPEED = 2.6;

export interface MoonOrbit {
  /** Distance from the Atom's centre, in the Atom's own units. */
  radius: number;
  /** Angular speed, in radians per second. */
  speed: number;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * The most moons an Atom will ever draw.
 *
 * They share one orbit inside a shell that is a few dozen pixels across, so
 * past this they overlap and the count stops being readable — and a count you
 * cannot take is not a reading. Same reason a Connection runs at most six
 * signal ticks. Beyond it the reading is "six or more".
 */
export const MAX_MOONS = 6;

/**
 * How many moons an Atom carries: one for every Article written about it.
 *
 * Counted off Articles rather than Rank on purpose. Rank is relative — it says
 * where an Atom stands against the rest, and it shifts when a *different* Atom
 * is written about. A count is absolute, so an Atom's moons only change when
 * its own writing does, and four moons means the same thing in an empty Sphere
 * as a full one.
 *
 * Only live, published Articles reach here; who is looking never changes the
 * number. See issue #30 — moons and Rank share this count, so a draft adding
 * one would resize Atoms and move orbits the moment the Owner signed in.
 */
export function moonCount(articleCount: number): number {
  const count = Number.isFinite(articleCount) ? Math.max(0, articleCount) : 0;
  return Math.min(MAX_MOONS, Math.floor(count));
}

export function moonOrbit(rank: number): MoonOrbit {
  const clamped = Math.min(1, Math.max(0, rank));
  return {
    radius: lerp(MIN_RADIUS, MAX_RADIUS, clamped),
    speed: lerp(MIN_SPEED, MAX_SPEED, clamped),
  };
}

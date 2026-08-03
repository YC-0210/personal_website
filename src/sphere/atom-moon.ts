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

export function moonOrbit(rank: number): MoonOrbit {
  const clamped = Math.min(1, Math.max(0, rank));
  return {
    radius: lerp(MIN_RADIUS, MAX_RADIUS, clamped),
    speed: lerp(MIN_SPEED, MAX_SPEED, clamped),
  };
}

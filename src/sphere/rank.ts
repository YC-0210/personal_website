import type { Atom, AtomId } from "./domain";

/**
 * Rank is what time spent buys an Atom: a bigger node, and later a tighter
 * orbit. It is relative — the Atom with the most hours ranks 1, and everything
 * else is measured against it — so the Sphere reads the same whether the Owner
 * counts in hours or in hundreds of hours.
 */
export interface AtomRank {
  /** 0 to 1, relative to the most-invested Atom in the Sphere. */
  rank: number;
  size: number;
  /** Distance from the Sphere's centre. Rank reads as depth as well as size. */
  orbitRadius: number;
}

const MIN_SIZE = 0.02;
const MAX_SIZE = 0.075;

/** The highest-ranked Atoms sit here, nearest the centre... */
const MIN_ORBIT_RADIUS = 0.55;
/** ...and the lowest-ranked ride the outer shell. */
const MAX_ORBIT_RADIUS = 1;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function rankAtoms(atoms: Atom[]): Record<AtomId, AtomRank> {
  const mostHours = Math.max(0, ...atoms.map((atom) => atom.hoursSpent));

  const ranked: Record<AtomId, AtomRank> = {};
  for (const atom of atoms) {
    const rank = mostHours === 0 ? 0 : atom.hoursSpent / mostHours;
    ranked[atom.id] = {
      rank,
      size: lerp(MIN_SIZE, MAX_SIZE, rank),
      orbitRadius: lerp(MAX_ORBIT_RADIUS, MIN_ORBIT_RADIUS, rank),
    };
  }
  return ranked;
}

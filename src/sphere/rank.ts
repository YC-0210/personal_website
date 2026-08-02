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

/**
 * PROTOTYPE ONLY (issue #24) — lets the rank-curve prototype swap the ratio
 * -> rank mapping at runtime without threading a param through every
 * `applySphere` call site. Defaults to identity, i.e. today's linear
 * behaviour. Remove this and the `curve` param below before merging; the
 * winning direction gets its curve hard-coded, not swappable.
 */
export let prototypeRankCurve: (ratio: number) => number = (ratio) => ratio;

/** PROTOTYPE ONLY (issue #24) — the only way to reassign the curve from outside this module. */
export function setPrototypeRankCurve(curve: (ratio: number) => number): void {
  prototypeRankCurve = curve;
}

export function rankAtoms(atoms: Atom[]): Record<AtomId, AtomRank> {
  const mostHours = Math.max(0, ...atoms.map((atom) => atom.hoursSpent));

  const ranked: Record<AtomId, AtomRank> = {};
  for (const atom of atoms) {
    const ratio = mostHours === 0 ? 0 : atom.hoursSpent / mostHours;
    const rank = mostHours === 0 ? 0 : prototypeRankCurve(ratio);
    ranked[atom.id] = {
      rank,
      size: lerp(MIN_SIZE, MAX_SIZE, rank),
      orbitRadius: lerp(MAX_ORBIT_RADIUS, MIN_ORBIT_RADIUS, rank),
    };
  }
  return ranked;
}

import type { Atom, AtomId } from "./domain";

/**
 * Rank is what writing buys an Atom: a bigger node and a tighter orbit. It is
 * relative — the Atom with the most Articles written about it ranks 1, and
 * everything else is measured against it — so the Sphere reads the same whether
 * the Owner has written three Articles or three hundred.
 */
export interface AtomRank {
  /** 0 to 1, relative to the most-written-about Atom in the Sphere. */
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
 * The chosen curve, from the three tried under ADR-0004: each doubling of the
 * writing about an Atom buys the same step of Rank.
 *
 * A straight `written / mostWritten` made the Sphere unreadable as soon as one
 * Atom ran away with the writing — everything else compressed against it and a
 * real difference rendered as none. On a log curve the towering Atom stops
 * setting the scale for everyone below it. Issue #30 changed the curve's input
 * from hours to Articles; the reason the curve was chosen does not depend on
 * the unit, so the curve itself stands.
 */
function rankOf(written: number, mostWritten: number): number {
  if (mostWritten <= 0) return 0;
  return Math.log1p(Math.max(0, written)) / Math.log1p(mostWritten);
}

/**
 * Rank every Atom by how many Articles have been written about it.
 *
 * The counts are the Article store's (ADR-0007) and arrive already filtered to
 * live, published Bondings — the same number the moons carry. An Atom missing
 * from `articleCounts` has had nothing written about it, which is a Rank of
 * zero rather than an error: the Sphere does not ask the Article store about
 * Atoms nothing cites.
 */
export function rankAtoms(
  atoms: Atom[],
  articleCounts: Record<AtomId, number> = {},
): Record<AtomId, AtomRank> {
  const writtenAbout = (atom: Atom) =>
    Math.max(0, articleCounts[atom.id] ?? 0);
  const mostWritten = Math.max(0, ...atoms.map(writtenAbout));

  const ranked: Record<AtomId, AtomRank> = {};
  for (const atom of atoms) {
    const rank = rankOf(writtenAbout(atom), mostWritten);
    ranked[atom.id] = {
      rank,
      size: lerp(MIN_SIZE, MAX_SIZE, rank),
      orbitRadius: lerp(MAX_ORBIT_RADIUS, MIN_ORBIT_RADIUS, rank),
    };
  }
  return ranked;
}

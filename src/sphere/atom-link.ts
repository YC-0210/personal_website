import type { AtomId } from "./domain";

const ATOM_ANCHOR_PREFIX = "atom-";

/**
 * The id the List view labels an Atom's entry with, and the fragment the scene
 * view reads a selection out of. One format for both, so a link into the Sphere
 * lands on the same Atom whichever view the reader ends up in.
 */
export function atomAnchor(atomId: AtomId): string {
  return `${ATOM_ANCHOR_PREFIX}${atomId}`;
}

/** A link into the Sphere that selects `atomId` on arrival. */
export function atomLink(atomId: AtomId): string {
  return `/#${atomAnchor(atomId)}`;
}

/**
 * The Atom a location hash names, or null if it names none.
 *
 * A hash is whatever the reader pasted into the address bar, so this is the
 * boundary where it stops being trusted: anything that is not an Atom anchor
 * carrying an id reads as no selection at all.
 */
export function atomIdFromHash(hash: string): AtomId | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : "";
  if (!fragment.startsWith(ATOM_ANCHOR_PREFIX)) return null;

  const atomId = fragment.slice(ATOM_ANCHOR_PREFIX.length);
  return atomId === "" ? null : atomId;
}

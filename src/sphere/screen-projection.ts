import type { AtomId } from "./domain";
import type { ScreenAtom } from "./panel-placement";

/**
 * Where each Atom currently lands on screen.
 *
 * The heads-up detail is DOM sitting over the canvas, and it has to know what
 * is behind it to stand clear. That is per-frame render data rather than
 * domain state, so it lives here in a plain mutable box instead of in the
 * Sphere store: the scene writes it inside `useFrame` and the overlay reads it
 * on its own animation frame, and React never re-renders for it.
 */
export interface ScreenProjection {
  atoms: ScreenAtom[];
  width: number;
  height: number;
}

const projection: ScreenProjection = { atoms: [], width: 0, height: 0 };

export function getScreenProjection(): ScreenProjection {
  return projection;
}

export function publishScreenProjection(
  atoms: ScreenAtom[],
  width: number,
  height: number,
): void {
  projection.atoms = atoms;
  projection.width = width;
  projection.height = height;
}

export function screenPositionOf(atomId: AtomId): ScreenAtom | undefined {
  return projection.atoms.find((atom) => atom.id === atomId);
}

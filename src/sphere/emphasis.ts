import {
  connectionTouchesAtom,
  type Atom,
  type AtomId,
  type Connection,
  type ConnectionId,
} from "./domain";

/**
 * How prominently one Atom or Connection should read, given the current
 * selection. The store derives this; the renderer only maps it to pixels.
 */
export type Emphasis = "neutral" | "highlighted" | "dimmed";

export interface SphereEmphasis {
  atoms: Record<AtomId, Emphasis>;
  connections: Record<ConnectionId, Emphasis>;
}

/**
 * With nothing selected the whole Sphere reads at its resting weight. With an
 * Atom selected, the Connections touching it and the Atoms at their far ends
 * are what the visitor is looking at, so they are the ones that stay lit.
 */
export function deriveEmphasis(
  atoms: Atom[],
  connections: Connection[],
  selectedAtomId: AtomId | null = null,
): SphereEmphasis {
  const emphasis: SphereEmphasis = { atoms: {}, connections: {} };
  for (const atom of atoms) emphasis.atoms[atom.id] = "neutral";
  for (const connection of connections) {
    emphasis.connections[connection.id] = "neutral";
  }

  if (selectedAtomId === null) return emphasis;

  for (const atom of atoms) emphasis.atoms[atom.id] = "dimmed";
  for (const connection of connections) {
    emphasis.connections[connection.id] = "dimmed";
  }

  emphasis.atoms[selectedAtomId] = "highlighted";
  for (const connection of connections) {
    if (!connectionTouchesAtom(connection, selectedAtomId)) continue;
    emphasis.connections[connection.id] = "highlighted";
    emphasis.atoms[connection.fromAtomId] = "highlighted";
    emphasis.atoms[connection.toAtomId] = "highlighted";
  }

  return emphasis;
}

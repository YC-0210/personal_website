import {
  connectionTouchesAtom,
  type Atom,
  type AtomId,
  type Connection,
  type ConnectionId,
} from "./domain";

/**
 * One Connection as it reads from a particular Atom's side of it. Connections
 * are undirected, so "to" here means the far end from wherever you are reading,
 * not a direction of influence.
 */
export interface OutlineConnection {
  id: ConnectionId;
  toAtomId: AtomId;
  toLabel: string;
  strength: number;
  description: string;
}

/**
 * The Sphere as text: every Atom, and the Connections leading away from it.
 *
 * This is what a screen reader and a browser without WebGL get instead of the
 * 3D scene, so it has to carry the same content the scene does — not a summary
 * of it. The store derives it; the fallback view only marks it up.
 */
export interface AtomOutline {
  atom: Atom;
  connections: OutlineConnection[];
}

export function outlineSphere(
  atoms: Atom[],
  connections: Connection[],
): AtomOutline[] {
  const labelOf = new Map(atoms.map((atom) => [atom.id, atom.label]));

  // Highest Rank first, so reading the outline top-to-bottom walks the Sphere
  // from its centre outward — the same hierarchy size and depth carry in 3D.
  return [...atoms]
    .sort((a, b) => b.hoursSpent - a.hoursSpent)
    .map((atom) => ({
      atom,
      connections: connections
        .filter((connection) => connectionTouchesAtom(connection, atom.id))
        .map((connection) => {
          const toAtomId =
            connection.fromAtomId === atom.id
              ? connection.toAtomId
              : connection.fromAtomId;
          return {
            id: connection.id,
            toAtomId,
            toLabel: labelOf.get(toAtomId) ?? toAtomId,
            strength: connection.strength,
            description: connection.description,
          };
        }),
    }));
}

/**
 * The vocabulary of the Knowledge Sphere.
 *
 * An Atom is one knowledge point. A Connection is an undirected, untyped
 * relationship between two Atoms, weighted by `strength` and explained by
 * `description`.
 */

export type AtomId = string;
export type ConnectionId = string;

export interface Atom {
  id: AtomId;
  label: string;
  description: string;
  /** Time the Owner has invested in this topic. Drives Rank in a later ticket. */
  hoursSpent: number;
}

export interface Connection {
  id: ConnectionId;
  /**
   * Connections are undirected — `fromAtomId`/`toAtomId` name the two
   * endpoints, they do not imply a direction of influence.
   */
  fromAtomId: AtomId;
  toAtomId: AtomId;
  /** How strongly the two Atoms relate, from 0 to 1. */
  strength: number;
  description: string;
}

/** A snapshot of everything the Sphere persists. */
export interface SphereSnapshot {
  atoms: Atom[];
  connections: Connection[];
}

export function connectionTouchesAtom(
  connection: Connection,
  atomId: AtomId,
): boolean {
  return connection.fromAtomId === atomId || connection.toAtomId === atomId;
}

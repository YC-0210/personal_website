/**
 * The vocabulary of the Knowledge Sphere.
 *
 * An Atom is one knowledge point. A Connection is an undirected, untyped
 * relationship between two Atoms, weighted by `strength` and explained by
 * `description`.
 */

export type AtomId = string;
export type ConnectionId = string;

/**
 * Where the Owner is with an Atom: still working through it, or done with it.
 *
 * This is not Rank. Rank is how much time went in and is derived from
 * `hoursSpent`; the learning state is a judgement the Owner makes, and a topic
 * can carry a thousand hours and still be ongoing. The Sphere shows the two
 * differently — Rank sets an Atom's size and how many moons it carries, the
 * learning state sets what colour those moons are.
 */
export type LearningState = "ongoing" | "learned";

/** What an Atom with no stated learning state is taken to be. */
export const DEFAULT_LEARNING_STATE: LearningState = "ongoing";

export interface Atom {
  id: AtomId;
  label: string;
  description: string;
  /** Time the Owner has invested in this topic. Drives Rank in a later ticket. */
  hoursSpent: number;
  learningState: LearningState;
}

/**
 * Read a learning state off whatever the store of record handed back.
 *
 * The boundary where an unknown value stops being trusted: a row written before
 * this column existed, a null, or a string nobody recognises all read as
 * `ongoing`. Nothing an Atom is *still* being learned can be wrong about — the
 * other direction would silently claim the Owner had finished with something.
 */
export function toLearningState(value: unknown): LearningState {
  return value === "learned" ? "learned" : DEFAULT_LEARNING_STATE;
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
  /**
   * The written half of the Explanation — what the knowledge linking the two
   * Atoms actually is. Empty only when `externalLink` carries the Explanation
   * instead; a Connection with neither is refused by the store.
   */
  description: string;
  /** The linked half of the Explanation: a URL to the thing that connects them. */
  externalLink?: string;
}

/**
 * What the Owner supplies when creating or editing an Atom. The id, and the
 * timestamps around it, belong to the store of record rather than the form.
 *
 * The learning state is optional here and required on the Atom: a draft that
 * does not mention it means "still learning", and the store is what settles
 * that before anything is written.
 */
export type AtomDraft = Omit<SettledAtomDraft, "learningState"> & {
  learningState?: LearningState;
};

/**
 * A draft with nothing left open — what the repository is actually handed.
 *
 * The store settles the learning state before any write, so persistence never
 * has to decide what an unspecified Atom means. Keeping that decision in one
 * place is what stops the fake and Postgres quietly disagreeing about it.
 */
export type SettledAtomDraft = Omit<Atom, "id">;

/** The same, for a Connection: the two endpoints, a Strength and a description. */
export type ConnectionDraft = Omit<Connection, "id">;

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

/**
 * The Atom at the opposite end of `connection` from `atomId`. Connections are
 * undirected, so which field holds which end carries no meaning.
 */
export function otherEndOfConnection(
  connection: Connection,
  atomId: AtomId,
): AtomId {
  return connection.fromAtomId === atomId
    ? connection.toAtomId
    : connection.fromAtomId;
}

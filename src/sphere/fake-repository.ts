import type { Atom, Connection, SphereSnapshot } from "./domain";
import type { SphereRepository } from "./repository";

export interface FakeSphereRepositoryOptions {
  atoms?: Atom[];
  connections?: Connection[];
}

/**
 * In-memory `SphereRepository` for tests. Holds a snapshot, hands out copies so
 * callers can't mutate it by accident, and can be told to fail on demand.
 */
export class FakeSphereRepository implements SphereRepository {
  private atoms: Atom[];
  private connections: Connection[];
  private failure: Error | null = null;

  /** How many times `loadSnapshot` has been called. */
  loadCount = 0;

  constructor(options: FakeSphereRepositoryOptions = {}) {
    this.atoms = [...(options.atoms ?? [])];
    this.connections = [...(options.connections ?? [])];
  }

  async loadSnapshot(): Promise<SphereSnapshot> {
    this.loadCount += 1;
    if (this.failure) throw this.failure;
    return {
      atoms: this.atoms.map((atom) => ({ ...atom })),
      connections: this.connections.map((connection) => ({ ...connection })),
    };
  }

  /** Replace the stored data, as if something changed behind the store's back. */
  setSnapshot(snapshot: SphereSnapshot): void {
    this.atoms = [...snapshot.atoms];
    this.connections = [...snapshot.connections];
  }

  /** Make every subsequent call reject, until `failWith(null)` clears it. */
  failWith(error: Error | null): void {
    this.failure = error;
  }
}

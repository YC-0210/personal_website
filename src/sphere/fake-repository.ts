import { connectionTouchesAtom } from "./domain";
import type {
  Atom,
  SettledAtomDraft,
  AtomId,
  Connection,
  ConnectionDraft,
  ConnectionId,
  SphereSnapshot,
} from "./domain";
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
  private nextId = 1;

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

  async createAtom(draft: SettledAtomDraft): Promise<Atom> {
    if (this.failure) throw this.failure;
    const atom: Atom = { ...draft, id: `generated-atom-${this.nextId++}` };
    this.atoms.push(atom);
    return { ...atom };
  }

  async updateAtom(atomId: AtomId, draft: SettledAtomDraft): Promise<Atom> {
    if (this.failure) throw this.failure;
    const index = this.atoms.findIndex((atom) => atom.id === atomId);
    if (index === -1) throw new Error(`No Atom with id ${atomId}`);

    this.atoms[index] = { ...draft, id: atomId };
    return { ...this.atoms[index] };
  }

  /**
   * Mirrors the `on delete cascade` on `connections.from_atom_id` /
   * `to_atom_id`: dropping an Atom drops the Connections that touched it.
   */
  async deleteAtom(atomId: AtomId): Promise<void> {
    if (this.failure) throw this.failure;
    this.atoms = this.atoms.filter((atom) => atom.id !== atomId);
    this.connections = this.connections.filter(
      (connection) => !connectionTouchesAtom(connection, atomId),
    );
  }

  async createConnection(draft: ConnectionDraft): Promise<Connection> {
    if (this.failure) throw this.failure;
    const connection: Connection = {
      ...draft,
      id: `generated-connection-${this.nextId++}`,
    };
    this.connections.push(connection);
    return { ...connection };
  }

  async updateConnection(
    connectionId: ConnectionId,
    draft: ConnectionDraft,
  ): Promise<Connection> {
    if (this.failure) throw this.failure;
    const index = this.connections.findIndex(
      (connection) => connection.id === connectionId,
    );
    if (index === -1) throw new Error(`No Connection with id ${connectionId}`);

    this.connections[index] = { ...draft, id: connectionId };
    return { ...this.connections[index] };
  }

  async deleteConnection(connectionId: ConnectionId): Promise<void> {
    if (this.failure) throw this.failure;
    this.connections = this.connections.filter(
      (connection) => connection.id !== connectionId,
    );
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

import type {
  Atom,
  SettledAtomDraft,
  AtomId,
  Connection,
  ConnectionDraft,
  ConnectionId,
  SphereSnapshot,
} from "./domain";

/**
 * Persistence seam for the Sphere store.
 *
 * The store never talks to Supabase directly — it talks to this. That keeps the
 * store's tests running against an in-memory fake, and keeps Supabase details
 * (column naming, error shapes) out of the domain.
 *
 * Writes return the saved record rather than nothing, so the store can fold the
 * id the store of record assigned straight into its state instead of reloading
 * the whole Sphere to find out what it was.
 */
export interface SphereRepository {
  /** Load every Atom and Connection. */
  loadSnapshot(): Promise<SphereSnapshot>;

  /** Persist a new Atom and return it with its assigned id. */
  createAtom(draft: SettledAtomDraft): Promise<Atom>;

  /** Overwrite an existing Atom and return it as saved. */
  updateAtom(atomId: AtomId, draft: SettledAtomDraft): Promise<Atom>;

  /**
   * Remove an Atom. Connections at either end of it go with it — a Connection
   * to an Atom that no longer exists is not a thing the Sphere can hold.
   */
  deleteAtom(atomId: AtomId): Promise<void>;

  /** Persist a new Connection and return it with its assigned id. */
  createConnection(draft: ConnectionDraft): Promise<Connection>;

  /** Overwrite an existing Connection and return it as saved. */
  updateConnection(
    connectionId: ConnectionId,
    draft: ConnectionDraft,
  ): Promise<Connection>;

  /** Remove a Connection. Both Atoms it ran between stay where they are. */
  deleteConnection(connectionId: ConnectionId): Promise<void>;
}

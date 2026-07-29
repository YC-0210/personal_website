import {
  connectionTouchesAtom,
  type Atom,
  type AtomDraft,
  type AtomId,
  type Connection,
} from "./domain";
import {
  UnconfiguredAuthProvider,
  type AuthProvider,
  type OwnerSession,
} from "./auth";
import { deriveEmphasis, type SphereEmphasis } from "./emphasis";
import { layoutSphere, type AtomLayout } from "./layout";
import { rankAtoms } from "./rank";
import type { SphereRepository } from "./repository";

export type SphereStatus = "idle" | "loading" | "ready" | "error";

export interface SphereState {
  status: SphereStatus;
  atoms: Atom[];
  connections: Connection[];
  /** Derived Rank and position per Atom, recomputed whenever the data changes. */
  layout: Record<AtomId, AtomLayout>;
  selectedAtomId: AtomId | null;
  /** How each Atom and Connection should read, given the current selection. */
  emphasis: SphereEmphasis;
  /** Message from the last failed load, cleared when a load succeeds. */
  error: string | null;
  /** The signed-in Owner, or null for a visitor. */
  owner: OwnerSession | null;
  /**
   * Whether the Owner's editing affordances should be offered. Edit Mode only
   * ever *adds* to the page — the Sphere itself renders the same either way.
   */
  isEditMode: boolean;
  /** Message from the last failed sign-in, cleared on the next attempt. */
  authError: string | null;
  /**
   * Message from the last failed Owner write. Kept apart from `error` so a
   * refused save reports itself in the form without taking the Sphere down.
   */
  writeError: string | null;
}

export type SphereListener = (state: SphereState) => void;

const EMPTY_STATE: SphereState = {
  status: "idle",
  atoms: [],
  connections: [],
  layout: {},
  selectedAtomId: null,
  emphasis: { atoms: {}, connections: {} },
  error: null,
  owner: null,
  isEditMode: false,
  authError: null,
  writeError: null,
};

/**
 * Owns Atom/Connection/selection state for the Sphere and is the only place
 * that talks to the repository. The rendering layer, the Owner's auth UI and
 * the edit forms are all thin consumers: they read this state and call these
 * operations, and hold no business logic of their own.
 *
 * This is the walking-skeleton shell — it can load a Sphere and track a
 * selection. Rank, layout, highlight/dim and Owner writes land in later
 * tickets; the shape of the seam is what matters here.
 */
export class SphereStore {
  private state: SphereState = EMPTY_STATE;
  private readonly listeners = new Set<SphereListener>();

  constructor(
    private readonly repository: SphereRepository,
    private readonly auth: AuthProvider = new UnconfiguredAuthProvider(),
  ) {}

  /**
   * The current snapshot. The returned object is frozen and replaced wholesale
   * on every change, so it is safe to use as a `useSyncExternalStore` snapshot.
   */
  getState(): SphereState {
    return this.state;
  }

  subscribe(listener: SphereListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Pull the whole Sphere from the repository. Safe to call repeatedly; the
   * current selection survives as long as its Atom still exists.
   */
  async load(): Promise<void> {
    this.setState({ status: "loading", error: null });

    try {
      const { atoms, connections } = await this.repository.loadSnapshot();
      this.applySphere(atoms, connections, { status: "ready", error: null });
    } catch (cause) {
      this.setState({
        status: "error",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /** Select an Atom. Unknown ids are ignored, leaving the selection as it was. */
  selectAtom(atomId: AtomId): void {
    if (!this.hasAtom(atomId)) return;
    if (this.state.selectedAtomId === atomId) return;
    this.setState({
      selectedAtomId: atomId,
      emphasis: deriveEmphasis(
        this.state.atoms,
        this.state.connections,
        atomId,
      ),
    });
  }

  /** Return to the default free-orbiting view. */
  clearSelection(): void {
    if (this.state.selectedAtomId === null) return;
    this.setState({
      selectedAtomId: null,
      emphasis: deriveEmphasis(this.state.atoms, this.state.connections),
    });
  }

  getAtom(atomId: AtomId): Atom | undefined {
    return this.state.atoms.find((atom) => atom.id === atomId);
  }

  hasAtom(atomId: AtomId): boolean {
    return this.state.atoms.some((atom) => atom.id === atomId);
  }

  /** Every Connection with `atomId` at either end. */
  connectionsForAtom(atomId: AtomId): Connection[] {
    return this.state.connections.filter((connection) =>
      connectionTouchesAtom(connection, atomId),
    );
  }

  /**
   * Create an Atom. It reaches Supabase first and only then the Sphere, so what
   * the Owner sees is what was actually saved — including the id assigned to it.
   */
  async addAtom(draft: AtomDraft): Promise<void> {
    await this.write(async () => {
      const atom = await this.repository.createAtom(draft);
      this.applySphere([...this.state.atoms, atom], this.state.connections);
    });
  }

  /** Rewrite an existing Atom. Rank and layout follow the new hours at once. */
  async editAtom(atomId: AtomId, draft: AtomDraft): Promise<void> {
    await this.write(async () => {
      const saved = await this.repository.updateAtom(atomId, draft);
      this.applySphere(
        this.state.atoms.map((atom) => (atom.id === atomId ? saved : atom)),
        this.state.connections,
      );
    });
  }

  /**
   * Remove an Atom and every Connection that touched it. The cascade is the
   * database's, and it is mirrored here so the Sphere doesn't briefly draw a
   * Connection to an Atom that has already gone.
   */
  async deleteAtom(atomId: AtomId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteAtom(atomId);
      this.applySphere(
        this.state.atoms.filter((atom) => atom.id !== atomId),
        this.state.connections.filter(
          (connection) => !connectionTouchesAtom(connection, atomId),
        ),
      );
    });
  }

  /**
   * Sign the Owner in. On success the page gains Edit Mode; on failure the
   * store stays exactly as it was, with the reason in `authError`.
   */
  async signIn(email: string, password: string): Promise<void> {
    this.setState({ authError: null });
    try {
      const owner = await this.auth.signIn(email, password);
      this.setState({ owner, isEditMode: true, authError: null });
    } catch (cause) {
      this.setState({
        owner: null,
        isEditMode: false,
        authError: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /** Return to the plain visitor experience on this device. */
  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.setState({ owner: null, isEditMode: false, authError: null });
  }

  /**
   * Pick up a session the Owner already had, and keep following it if it goes
   * away on its own. Returns the unsubscribe for the session listener.
   */
  async restoreSession(): Promise<() => void> {
    const unsubscribe = this.auth.onSessionChange((session) => {
      this.setState({ owner: session, isEditMode: session !== null });
    });

    try {
      const session = await this.auth.currentSession();
      this.setState({ owner: session, isEditMode: session !== null });
    } catch {
      // A session we can't read is the same as no session; the visitor view is
      // the safe default and sign-in is still one click away.
      this.setState({ owner: null, isEditMode: false });
    }

    return unsubscribe;
  }

  /**
   * The common shape of every Owner write: refuse it outright unless Edit Mode
   * is on, and record why it failed if it did.
   *
   * Supabase's RLS policies are what actually keep a visitor out; the Edit Mode
   * check is the near side of that same rule, so a write that could only ever be
   * refused is never sent and a bug in the UI can't quietly attempt one.
   *
   * The rejection is re-thrown as well as recorded, so a caller that wants to
   * keep a form open on failure can await it, and one that only renders state
   * can read `writeError`.
   */
  private async write(operation: () => Promise<void>): Promise<void> {
    if (!this.state.isEditMode) {
      const refusal = new Error("Edit Mode is required to change the Sphere.");
      this.setState({ writeError: refusal.message });
      throw refusal;
    }

    try {
      this.setState({ writeError: null });
      await operation();
    } catch (cause) {
      this.setState({
        writeError: cause instanceof Error ? cause.message : String(cause),
      });
      throw cause;
    }
  }

  /**
   * Put a new set of Atoms and Connections in play and re-derive everything that
   * hangs off them — Rank, layout and emphasis — in one state change.
   *
   * Every path that changes the data goes through here, so an Owner write and a
   * reload leave the Sphere in exactly the same shape. The selection survives as
   * long as its Atom does.
   */
  private applySphere(
    atoms: Atom[],
    connections: Connection[],
    patch: Partial<SphereState> = {},
  ): void {
    const selectedAtomId = atoms.some(
      (atom) => atom.id === this.state.selectedAtomId,
    )
      ? this.state.selectedAtomId
      : null;

    this.setState({
      atoms,
      connections,
      layout: layoutSphere(atoms, connections, rankAtoms(atoms)),
      selectedAtomId,
      emphasis: deriveEmphasis(atoms, connections, selectedAtomId),
      ...patch,
    });
  }

  private setState(patch: Partial<SphereState>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }
}

export function createSphereStore(
  repository: SphereRepository,
  auth?: AuthProvider,
): SphereStore {
  return new SphereStore(repository, auth);
}

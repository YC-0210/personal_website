import {
  connectionTouchesAtom,
  otherEndOfConnection,
  type Atom,
  type AtomDraft,
  type AtomId,
  type Connection,
  type ConnectionDraft,
  type ConnectionId,
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
  /**
   * The Connection the Owner is in the middle of drawing, if any. Clicking an
   * Atom fills the near end, clicking a second fills the far one; once both are
   * set the form has everything it needs bar Strength and a description.
   */
  pendingConnection: PendingConnection | null;
}

/** The two ends of a Connection being drawn, either of which may not be picked yet. */
export interface PendingConnection {
  fromAtomId: AtomId | null;
  toAtomId: AtomId | null;
}

export type SphereListener = (state: SphereState) => void;

/** One row of the detail panel's Connections list. */
export interface ConnectionDetail {
  connection: Connection;
  /** The Atom this Connection leads to from the Atom being described. */
  otherAtom: Atom;
}

/** Everything the detail panel shows about one Atom. */
export interface AtomDetail {
  atom: Atom;
  connections: ConnectionDetail[];
}

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
  pendingConnection: null,
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

  /**
   * Start drawing a Connection. The next two Atoms the Owner clicks become its
   * ends — the gesture *is* the selection they already use to point at an Atom,
   * so there is nothing new to learn and nothing to drag.
   */
  beginConnection(): void {
    this.requireEditMode();
    this.setState({ pendingConnection: { fromAtomId: null, toAtomId: null } });
  }

  /** Abandon a half-drawn Connection. */
  cancelConnection(): void {
    if (this.state.pendingConnection === null) return;
    this.setState({ pendingConnection: null });
  }

  /**
   * Select an Atom. Unknown ids are ignored, leaving the selection as it was.
   *
   * While a Connection is being drawn this is how its ends get picked, so the
   * click does double duty: it still selects, and it fills the next open end.
   */
  selectAtom(atomId: AtomId): void {
    if (!this.hasAtom(atomId)) return;
    this.pickConnectionEnd(atomId);
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

  /**
   * Follow a Connection out of the current selection, landing on the Atom at
   * its far end.
   */
  selectViaConnection(connectionId: ConnectionId): void {
    const { selectedAtomId } = this.state;
    if (selectedAtomId === null) return;

    const connection = this.state.connections.find(
      (candidate) => candidate.id === connectionId,
    );
    // Only the Connections leaving the current selection are routes; the rest
    // are dimmed and unclickable, so reaching one is a bug, not a navigation.
    if (!connection || !connectionTouchesAtom(connection, selectedAtomId)) {
      return;
    }

    this.selectAtom(otherEndOfConnection(connection, selectedAtomId));
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
   * What the detail panel shows: the selected Atom, and every Connection
   * leaving it paired with the Atom it leads to.
   */
  selectedDetail(): AtomDetail | null {
    const atom = this.state.selectedAtomId
      ? this.getAtom(this.state.selectedAtomId)
      : undefined;
    if (!atom) return null;

    const connections: ConnectionDetail[] = [];
    for (const connection of this.connectionsForAtom(atom.id)) {
      const otherAtom = this.getAtom(otherEndOfConnection(connection, atom.id));
      if (otherAtom) connections.push({ connection, otherAtom });
    }

    return { atom, connections };
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
   * Create a Connection between two Atoms. Strength feeds the layout's
   * attraction, so the Sphere re-settles around the new link straight away.
   */
  async addConnection(draft: ConnectionDraft): Promise<void> {
    await this.write(async () => {
      // Connections are undirected, so A-B and B-A are the same Connection. The
      // schema enforces that with a unique index on the canonically-ordered
      // pair; catching it here turns a constraint name into a sentence.
      const alreadyConnected = this.state.connections.some(
        (connection) =>
          connectionTouchesAtom(connection, draft.fromAtomId) &&
          connectionTouchesAtom(connection, draft.toAtomId),
      );
      if (alreadyConnected) {
        throw new Error("Those two Atoms are already connected.");
      }

      const connection = await this.repository.createConnection(draft);
      this.applySphere(this.state.atoms, [
        ...this.state.connections,
        connection,
      ]);
    });
  }

  /**
   * Save the Connection the Owner has been drawing, with the Strength and
   * description they filled in. The pair comes from the two Atoms they clicked
   * rather than from the form, so the endpoints are settled before it opens.
   */
  async completeConnection(
    details: Pick<ConnectionDraft, "strength" | "description">,
  ): Promise<void> {
    const pending = this.state.pendingConnection;
    if (pending?.fromAtomId == null || pending.toAtomId == null) {
      const refusal = new Error(
        "Pick two Atoms before saving the Connection between them.",
      );
      this.setState({ writeError: refusal.message });
      throw refusal;
    }

    await this.addConnection({
      fromAtomId: pending.fromAtomId,
      toAtomId: pending.toAtomId,
      ...details,
    });
    this.setState({ pendingConnection: null });
  }

  /** Rewrite a Connection. The layout re-settles on the new Strength at once. */
  async editConnection(
    connectionId: ConnectionId,
    draft: ConnectionDraft,
  ): Promise<void> {
    await this.write(async () => {
      const saved = await this.repository.updateConnection(connectionId, draft);
      this.applySphere(
        this.state.atoms,
        this.state.connections.map((connection) =>
          connection.id === connectionId ? saved : connection,
        ),
      );
    });
  }

  /** Remove a Connection. Both Atoms it ran between stay exactly where they are. */
  async deleteConnection(connectionId: ConnectionId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteConnection(connectionId);
      this.applySphere(
        this.state.atoms,
        this.state.connections.filter(
          (connection) => connection.id !== connectionId,
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
   * Fill the next open end of the Connection being drawn.
   *
   * An Atom cannot connect to itself — the schema says so too — so clicking the
   * near end again leaves the far one open rather than closing the pair.
   */
  private pickConnectionEnd(atomId: AtomId): void {
    const pending = this.state.pendingConnection;
    if (pending === null) return;

    if (pending.fromAtomId === null) {
      this.setState({ pendingConnection: { ...pending, fromAtomId: atomId } });
      return;
    }
    if (pending.toAtomId === null && atomId !== pending.fromAtomId) {
      this.setState({ pendingConnection: { ...pending, toAtomId: atomId } });
    }
  }

  /**
   * Supabase's RLS policies are what actually keep a visitor out. This is the
   * near side of the same rule, applied to the gestures that lead to a write as
   * well as to the writes themselves.
   */
  private requireEditMode(): void {
    if (!this.state.isEditMode) {
      throw new Error("Edit Mode is required to change the Sphere.");
    }
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
    try {
      this.requireEditMode();
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

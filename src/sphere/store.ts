import {
  connectionTouchesAtom,
  type Atom,
  type AtomId,
  type Connection,
  type ConnectionId,
} from "./domain";
import {
  UnconfiguredAuthProvider,
  type AuthProvider,
  type OwnerSession,
} from "./auth";
import { deriveEmphasis, type SphereEmphasis } from "./emphasis";
import { layoutSphere, type AtomLayout } from "./layout";
import { outlineSphere, type AtomOutline } from "./outline";
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
  /**
   * The Atom the camera has been asked to travel to. Set when the visitor
   * navigates *by relationship* — following a Connection moves them somewhere
   * they may not be looking, so the view has to follow. Selecting an Atom they
   * already clicked in the field leaves this alone.
   */
  cameraFocusAtomId: AtomId | null;
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
}

export type SphereListener = (state: SphereState) => void;

const EMPTY_STATE: SphereState = {
  status: "idle",
  atoms: [],
  connections: [],
  layout: {},
  selectedAtomId: null,
  cameraFocusAtomId: null,
  emphasis: { atoms: {}, connections: {} },
  error: null,
  owner: null,
  isEditMode: false,
  authError: null,
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
      const selectionSurvives =
        this.state.selectedAtomId !== null &&
        atoms.some((atom) => atom.id === this.state.selectedAtomId);

      this.setState({
        status: "ready",
        atoms,
        connections,
        layout: layoutSphere(atoms, connections, rankAtoms(atoms)),
        selectedAtomId: selectionSurvives ? this.state.selectedAtomId : null,
        // A camera sent somewhere that no longer exists has nowhere to be.
        cameraFocusAtomId:
          this.state.cameraFocusAtomId !== null &&
          atoms.some((atom) => atom.id === this.state.cameraFocusAtomId)
            ? this.state.cameraFocusAtomId
            : null,
        emphasis: deriveEmphasis(
          atoms,
          connections,
          selectionSurvives ? this.state.selectedAtomId : null,
        ),
        error: null,
      });
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

  /**
   * Travel along a Connection from the selected Atom to the one at its far end,
   * and select that. This is how a visitor navigates by relationship rather
   * than by hunting for the next Atom in the field.
   */
  followConnection(connectionId: ConnectionId): void {
    const connection = this.state.connections.find(
      (candidate) => candidate.id === connectionId,
    );
    const from = this.state.selectedAtomId;
    if (!connection || from === null) return;
    // Only the Connections currently lit are followable; a Connection the
    // selection does not touch has no far end to travel to from here.
    if (!connectionTouchesAtom(connection, from)) return;
    const far =
      connection.fromAtomId === from
        ? connection.toAtomId
        : connection.fromAtomId;
    this.selectAtom(far);
    this.setState({ cameraFocusAtomId: far });
  }

  /** Return to the default free-orbiting view. */
  clearSelection(): void {
    if (this.state.selectedAtomId === null) return;
    this.setState({
      selectedAtomId: null,
      cameraFocusAtomId: null,
      emphasis: deriveEmphasis(this.state.atoms, this.state.connections),
    });
  }

  getAtom(atomId: AtomId): Atom | undefined {
    return this.state.atoms.find((atom) => atom.id === atomId);
  }

  hasAtom(atomId: AtomId): boolean {
    return this.state.atoms.some((atom) => atom.id === atomId);
  }

  /**
   * The whole Sphere as text, for the fallback view. Derived on demand rather
   * than kept in state — nothing about it can drift from `atoms` that way.
   */
  outline(): AtomOutline[] {
    return outlineSphere(this.state.atoms, this.state.connections);
  }

  /** Every Connection with `atomId` at either end. */
  connectionsForAtom(atomId: AtomId): Connection[] {
    return this.state.connections.filter((connection) =>
      connectionTouchesAtom(connection, atomId),
    );
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

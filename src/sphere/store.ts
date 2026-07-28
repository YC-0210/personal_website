import {
  connectionTouchesAtom,
  type Atom,
  type AtomId,
  type Connection,
} from "./domain";
import type { SphereRepository } from "./repository";

export type SphereStatus = "idle" | "loading" | "ready" | "error";

export interface SphereState {
  status: SphereStatus;
  atoms: Atom[];
  connections: Connection[];
  selectedAtomId: AtomId | null;
  /** Message from the last failed load, cleared when a load succeeds. */
  error: string | null;
}

export type SphereListener = (state: SphereState) => void;

const EMPTY_STATE: SphereState = {
  status: "idle",
  atoms: [],
  connections: [],
  selectedAtomId: null,
  error: null,
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

  constructor(private readonly repository: SphereRepository) {}

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
        selectedAtomId: selectionSurvives ? this.state.selectedAtomId : null,
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
    this.setState({ selectedAtomId: atomId });
  }

  /** Return to the default free-orbiting view. */
  clearSelection(): void {
    if (this.state.selectedAtomId === null) return;
    this.setState({ selectedAtomId: null });
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

  private setState(patch: Partial<SphereState>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }
}

export function createSphereStore(repository: SphereRepository): SphereStore {
  return new SphereStore(repository);
}

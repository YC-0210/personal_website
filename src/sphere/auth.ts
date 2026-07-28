/** Who the Owner is, as far as the Sphere is concerned. */
export interface OwnerSession {
  email: string;
}

/**
 * Authentication seam for the Sphere store, sitting alongside the repository.
 *
 * There is exactly one account — the Owner's — and no public sign-up path, so
 * this interface deliberately has no `register`. Sign-in either yields the
 * Owner's session or throws.
 */
export interface AuthProvider {
  /** The session already in play, if the Owner signed in on a previous visit. */
  currentSession(): Promise<OwnerSession | null>;
  signIn(email: string, password: string): Promise<OwnerSession>;
  signOut(): Promise<void>;
  /** Fires when a session appears or disappears outside of sign-in/sign-out. */
  onSessionChange(listener: (session: OwnerSession | null) => void): () => void;
}

/**
 * Stands in when no provider is wired up. Everything reads as signed out and
 * any attempt to sign in fails loudly, rather than silently doing nothing.
 */
export class UnconfiguredAuthProvider implements AuthProvider {
  async currentSession(): Promise<OwnerSession | null> {
    return null;
  }

  async signIn(): Promise<OwnerSession> {
    throw new Error("Authentication is not configured.");
  }

  async signOut(): Promise<void> {}

  onSessionChange(): () => void {
    return () => {};
  }
}

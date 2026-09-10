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
  /**
   * Trade the refresh token for a new access token, now.
   *
   * The client refreshes on its own schedule, but that schedule stops while
   * the tab is asleep — so this is the deliberate ask, made when a request has
   * already come back refused because the token it carried had expired.
   */
  refreshSession(): Promise<OwnerSession | null>;
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

  async refreshSession(): Promise<OwnerSession | null> {
    return null;
  }

  onSessionChange(): () => void {
    return () => {};
  }
}

import type { AuthProvider, OwnerSession } from "./auth";

export interface FakeAuthProviderOptions {
  /** The single account that exists. Anything else is a bad credential. */
  owner: { email: string; password: string };
  /** Start with the Owner already signed in, as if returning to the page. */
  signedIn?: boolean;
}

/**
 * In-memory `AuthProvider` for tests. Knows one account, rejects everything
 * else, and can be told to fail outright to stand in for a network problem.
 */
export class FakeAuthProvider implements AuthProvider {
  private session: OwnerSession | null;
  private failure: Error | null = null;
  private readonly listeners = new Set<
    (session: OwnerSession | null) => void
  >();

  signInAttempts = 0;
  /** How many times a stale token has been traded in for a fresh one. */
  refreshCount = 0;
  private refreshEffect: (() => void) | null = null;

  constructor(private readonly options: FakeAuthProviderOptions) {
    this.session = options.signedIn ? { email: options.owner.email } : null;
  }

  async currentSession(): Promise<OwnerSession | null> {
    if (this.failure) throw this.failure;
    return this.session;
  }

  async signIn(email: string, password: string): Promise<OwnerSession> {
    this.signInAttempts += 1;
    if (this.failure) throw this.failure;

    const { owner } = this.options;
    if (email !== owner.email || password !== owner.password) {
      throw new Error("Invalid login credentials");
    }

    this.session = { email: owner.email };
    return this.session;
  }

  async refreshSession(): Promise<OwnerSession | null> {
    this.refreshCount += 1;
    if (this.failure) throw this.failure;
    this.refreshEffect?.();
    return this.session;
  }

  /**
   * What a successful refresh changes in the world — normally that the
   * repository stops refusing calls, because the token it was refusing is no
   * longer the one being sent.
   */
  onRefresh(effect: () => void): void {
    this.refreshEffect = effect;
  }

  async signOut(): Promise<void> {
    if (this.failure) throw this.failure;
    this.session = null;
  }

  onSessionChange(listener: (session: OwnerSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Simulate the session going away on its own — an expiry, say. */
  expireSession(): void {
    this.session = null;
    for (const listener of this.listeners) listener(null);
  }

  failWith(error: Error | null): void {
    this.failure = error;
  }
}

/**
 * Recovering from a stale access token, so a click doesn't cost a reload.
 *
 * A Supabase access token lives an hour. The client refreshes it on its own,
 * but only while the tab is awake: a laptop that sleeps with the site open, or
 * a refresh that fails on a network the machine has only half rejoined, leaves
 * the next request carrying a token the server will not take. PostgREST refuses
 * it, and nothing in the app asks for a new one — so the Owner reloads, which
 * is the *only* thing that ever does.
 *
 * This makes that reload the app's job instead of the Owner's: refuse once,
 * refresh, try again.
 */

/**
 * Whether a failure is the access token having gone stale, rather than the
 * request being wrong.
 *
 * Matched on the message because the shape differs by layer — PostgREST sends
 * `PGRST301`, Storage sends a 401, GoTrue says the token is expired or invalid —
 * and because the repositories wrap the message in a sentence of their own
 * before it gets here.
 */
export function isStaleSession(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /PGRST301|JWT expired|JWT is expired|invalid JWT|token is expired|bad_jwt|invalid claim/i.test(
    message,
  );
}

/** What the Owner is told when the session is gone for good rather than stale. */
export const SESSION_GONE =
  "Your session has expired. Sign in again to keep editing.";

/**
 * Wrap a repository so every call on it survives one stale token.
 *
 * Wrapping the *repository* rather than the store operation is deliberate: a
 * store operation can be several writes (starting an Article bonded to an Atom
 * is a create and then a bond), and replaying the whole of one would write the
 * first of them twice. A refused call, on the other hand, never reached the
 * database — the token is rejected before any row is touched — so replaying
 * exactly the call that failed is safe.
 *
 * A Proxy rather than a hand-written decorator per method, so that adding a
 * method to a repository cannot quietly leave it un-recovered.
 */
export function recoverStaleSession<T extends object>(
  inner: T,
  refresh: () => Promise<unknown>,
): T {
  return new Proxy(inner, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (cause) {
          if (!isStaleSession(cause)) throw cause;

          // Exactly one replay. A second refusal is not a stale token any
          // more — it is a session that has genuinely ended, and retrying it
          // again would only spin.
          try {
            await refresh();
          } catch {
            throw new Error(SESSION_GONE);
          }

          try {
            return await value.apply(target, args);
          } catch (afterRefresh) {
            // Only a *second* session refusal means the session is gone.
            // Anything else is the call failing on its own merits, and saying
            // "sign in again" would send the Owner somewhere that cannot help.
            if (isStaleSession(afterRefresh)) throw new Error(SESSION_GONE);
            throw afterRefresh;
          }
        }
      };
    },
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { AuthProvider, OwnerSession } from "./auth";

/**
 * The real `AuthProvider`, backed by Supabase Auth.
 *
 * There is one seeded Owner account and public sign-up is off, so this only
 * ever signs that account in — there is deliberately no registration path here
 * for a visitor to find.
 */
export class SupabaseAuthProvider implements AuthProvider {
  private readonly resolveClient: () => SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.resolveClient = client ? () => client : getSupabaseClient;
  }

  async currentSession(): Promise<OwnerSession | null> {
    const { data, error } = await this.resolveClient().auth.getSession();
    if (error) throw new Error(error.message);

    const email = data.session?.user.email;
    return email ? { email } : null;
  }

  async signIn(email: string, password: string): Promise<OwnerSession> {
    const { data, error } = await this.resolveClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    const signedInEmail = data.session?.user.email;
    if (!signedInEmail) throw new Error("Sign-in returned no session.");
    return { email: signedInEmail };
  }

  async signOut(): Promise<void> {
    const { error } = await this.resolveClient().auth.signOut();
    if (error) throw new Error(error.message);
  }

  onSessionChange(listener: (session: OwnerSession | null) => void): () => void {
    const { data } = this.resolveClient().auth.onAuthStateChange(
      (_event, session) => {
        const email = session?.user.email;
        listener(email ? { email } : null);
      },
    );
    return () => data.subscription.unsubscribe();
  }
}

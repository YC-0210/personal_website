import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { Atom, Connection, SphereSnapshot } from "./domain";
import type { SphereRepository } from "./repository";

interface AtomRow {
  id: string;
  label: string;
  description: string;
  hours_spent: number | string;
}

interface ConnectionRow {
  id: string;
  from_atom_id: string;
  to_atom_id: string;
  strength: number | string;
  description: string;
}

function toAtom(row: AtomRow): Atom {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    hoursSpent: Number(row.hours_spent),
  };
}

function toConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    fromAtomId: row.from_atom_id,
    toAtomId: row.to_atom_id,
    strength: Number(row.strength),
    description: row.description,
  };
}

/**
 * The real `SphereRepository`, backed by Postgres through Supabase.
 *
 * Postgres `numeric` columns arrive as strings over PostgREST, so every numeric
 * field is coerced here rather than leaking that detail into the store.
 */
export class SupabaseSphereRepository implements SphereRepository {
  /**
   * Resolved on first use rather than in the constructor, so a missing
   * environment variable surfaces as a load error the store can report instead
   * of an exception thrown mid-render.
   */
  private readonly resolveClient: () => SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.resolveClient = client ? () => client : getSupabaseClient;
  }

  async loadSnapshot(): Promise<SphereSnapshot> {
    const client = this.resolveClient();

    const [atomsResult, connectionsResult] = await Promise.all([
      client
        .from("atoms")
        .select("id, label, description, hours_spent")
        .order("created_at", { ascending: true }),
      client
        .from("connections")
        .select("id, from_atom_id, to_atom_id, strength, description")
        .order("created_at", { ascending: true }),
    ]);

    if (atomsResult.error) {
      throw new Error(`Could not load Atoms: ${atomsResult.error.message}`);
    }
    if (connectionsResult.error) {
      throw new Error(
        `Could not load Connections: ${connectionsResult.error.message}`,
      );
    }

    return {
      atoms: (atomsResult.data as AtomRow[]).map(toAtom),
      connections: (connectionsResult.data as ConnectionRow[]).map(
        toConnection,
      ),
    };
  }
}

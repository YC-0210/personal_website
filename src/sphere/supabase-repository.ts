import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import {
  toLearningState,
  type Atom,
  type AtomId,
  type Connection,
  type ConnectionDraft,
  type ConnectionId,
  type SettledAtomDraft,
  type SphereSnapshot,
} from "./domain";
import type { SphereRepository } from "./repository";

const ATOM_COLUMNS = "id, label, description, hours_spent, learning_state";
const CONNECTION_COLUMNS =
  "id, from_atom_id, to_atom_id, strength, description, external_link";

interface AtomRow {
  id: string;
  label: string;
  description: string;
  hours_spent: number | string;
  learning_state: string | null;
}

interface ConnectionRow {
  id: string;
  from_atom_id: string;
  to_atom_id: string;
  strength: number | string;
  description: string;
  external_link: string | null;
}

function toAtom(row: AtomRow): Atom {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    hoursSpent: Number(row.hours_spent),
    // Normalised rather than cast: a row written before the column existed, or
    // anything unrecognised, reads as still-being-learned.
    learningState: toLearningState(row.learning_state),
  };
}

function fromAtomDraft(draft: SettledAtomDraft) {
  return {
    label: draft.label,
    description: draft.description,
    hours_spent: draft.hoursSpent,
    learning_state: draft.learningState,
  };
}

function fromConnectionDraft(draft: ConnectionDraft) {
  return {
    from_atom_id: draft.fromAtomId,
    to_atom_id: draft.toAtomId,
    strength: draft.strength,
    description: draft.description,
    // The column is nullable, and "no link" is an absence rather than a blank.
    external_link: draft.externalLink?.trim() || null,
  };
}

function toConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    fromAtomId: row.from_atom_id,
    toAtomId: row.to_atom_id,
    strength: Number(row.strength),
    description: row.description,
    ...(row.external_link ? { externalLink: row.external_link } : {}),
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
        .select(ATOM_COLUMNS)
        .order("created_at", { ascending: true }),
      client
        .from("connections")
        .select(CONNECTION_COLUMNS)
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

  async createAtom(draft: SettledAtomDraft): Promise<Atom> {
    const { data, error } = await this.resolveClient()
      .from("atoms")
      .insert(fromAtomDraft(draft))
      .select(ATOM_COLUMNS)
      .single();

    if (error) throw new Error(`Could not add the Atom: ${error.message}`);
    return toAtom(data as AtomRow);
  }

  async updateAtom(atomId: AtomId, draft: SettledAtomDraft): Promise<Atom> {
    const { data, error } = await this.resolveClient()
      .from("atoms")
      .update(fromAtomDraft(draft))
      .eq("id", atomId)
      .select(ATOM_COLUMNS)
      .single();

    if (error) throw new Error(`Could not save the Atom: ${error.message}`);
    return toAtom(data as AtomRow);
  }

  /** The Connection cascade is the schema's `on delete cascade`, not a second call. */
  async deleteAtom(atomId: AtomId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("atoms")
      .delete()
      .eq("id", atomId);

    if (error) throw new Error(`Could not delete the Atom: ${error.message}`);
  }

  async createConnection(draft: ConnectionDraft): Promise<Connection> {
    const { data, error } = await this.resolveClient()
      .from("connections")
      .insert(fromConnectionDraft(draft))
      .select(CONNECTION_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Could not add the Connection: ${error.message}`);
    }
    return toConnection(data as ConnectionRow);
  }

  async updateConnection(
    connectionId: ConnectionId,
    draft: ConnectionDraft,
  ): Promise<Connection> {
    const { data, error } = await this.resolveClient()
      .from("connections")
      .update(fromConnectionDraft(draft))
      .eq("id", connectionId)
      .select(CONNECTION_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Could not save the Connection: ${error.message}`);
    }
    return toConnection(data as ConnectionRow);
  }

  async deleteConnection(connectionId: ConnectionId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("connections")
      .delete()
      .eq("id", connectionId);

    if (error) {
      throw new Error(`Could not delete the Connection: ${error.message}`);
    }
  }
}

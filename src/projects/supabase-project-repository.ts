import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  DaylogEntry,
  DaylogEntryBody,
  DaylogEntryDraft,
  DaylogEntryId,
  Project,
  ProjectBonding,
  ProjectBondingDraft,
  ProjectBondingId,
  ProjectDraft,
  ProjectId,
} from "./domain";
import type { ProjectRepository } from "./repository";

const PROJECT_COLUMNS = "id, name, description, deleted_at";
const ENTRY_COLUMNS =
  "id, project_id, entry_date, body, created_at, published_at";
const BONDING_COLUMNS = "id, project_id, atom_id, name";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  deleted_at: string | null;
}

interface EntryRow {
  id: string;
  project_id: string;
  /** A `date` column, so this arrives as `YYYY-MM-DD` with no time on it. */
  entry_date: string;
  /** `jsonb`, so this arrives already parsed — a Tiptap document, not a string. */
  body: DaylogEntryBody;
  created_at: string;
  published_at: string | null;
}

interface BondingRow {
  id: string;
  project_id: string;
  atom_id: string;
  name: string | null;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    deletedAt: row.deleted_at,
  };
}

function toEntry(row: EntryRow): DaylogEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    date: row.entry_date,
    body: row.body,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

function toBonding(row: BondingRow): ProjectBonding {
  return {
    id: row.id,
    projectId: row.project_id,
    atomId: row.atom_id,
    name: row.name,
  };
}

function fromEntryDraft(draft: DaylogEntryDraft) {
  return { entry_date: draft.date, body: draft.body };
}

/**
 * The real `ProjectRepository`, backed by Postgres through Supabase.
 *
 * Nothing here decides who may read what. A Project's visibility is derived in
 * the database — the RLS policy admits it only once a published Daylog Entry
 * exists in it — so a Visitor's select never has the row on the wire at all.
 * The store holds the near side of the same rule, and this sits between them
 * carrying rows.
 */
export class SupabaseProjectRepository implements ProjectRepository {
  private readonly resolveClient: () => SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.resolveClient = client ? () => client : getSupabaseClient;
  }

  async loadProjects(): Promise<Project[]> {
    const { data, error } = await this.resolveClient()
      .from("projects")
      .select(PROJECT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Could not load the Projects: ${error.message}`);
    return (data as ProjectRow[]).map(toProject);
  }

  async createProject(draft: ProjectDraft): Promise<Project> {
    const { data, error } = await this.resolveClient()
      .from("projects")
      .insert({ name: draft.name, description: draft.description })
      .select(PROJECT_COLUMNS)
      .single();

    if (error) throw new Error(`Could not start the Project: ${error.message}`);
    return toProject(data as ProjectRow);
  }

  async updateProject(
    projectId: ProjectId,
    draft: ProjectDraft,
  ): Promise<Project> {
    return this.patchProject(
      projectId,
      { name: draft.name, description: draft.description },
      "save",
    );
  }

  async trashProject(projectId: ProjectId): Promise<Project> {
    return this.patchProject(
      projectId,
      { deleted_at: new Date().toISOString() },
      "delete",
    );
  }

  async restoreProject(projectId: ProjectId): Promise<Project> {
    return this.patchProject(projectId, { deleted_at: null }, "restore");
  }

  async loadEntries(): Promise<DaylogEntry[]> {
    const { data, error } = await this.resolveClient()
      .from("daylog_entries")
      .select(ENTRY_COLUMNS)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Could not load the Daylog: ${error.message}`);
    return (data as EntryRow[]).map(toEntry);
  }

  async createEntry(
    projectId: ProjectId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry> {
    const { data, error } = await this.resolveClient()
      .from("daylog_entries")
      .insert({ project_id: projectId, ...fromEntryDraft(draft) })
      .select(ENTRY_COLUMNS)
      .single();

    if (error) throw new Error(`Could not add the day: ${error.message}`);
    return toEntry(data as EntryRow);
  }

  async updateEntry(
    entryId: DaylogEntryId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry> {
    return this.patchEntry(entryId, fromEntryDraft(draft), "save");
  }

  async publishEntry(entryId: DaylogEntryId): Promise<DaylogEntry> {
    return this.patchEntry(
      entryId,
      { published_at: new Date().toISOString() },
      "publish",
    );
  }

  async deleteEntryForever(entryId: DaylogEntryId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("daylog_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      throw new Error(`Could not delete the day: ${error.message}`);
    }
  }

  async loadBondings(): Promise<ProjectBonding[]> {
    const { data, error } = await this.resolveClient()
      .from("project_bondings")
      .select(BONDING_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Could not load the Project Bondings: ${error.message}`);
    }
    return (data as BondingRow[]).map(toBonding);
  }

  async createBonding(draft: ProjectBondingDraft): Promise<ProjectBonding> {
    const { data, error } = await this.resolveClient()
      .from("project_bondings")
      .insert({
        project_id: draft.projectId,
        atom_id: draft.atomId,
        // A blank Name is stored as no Name. The column's check refuses an
        // all-whitespace one, and "" from an untouched input is exactly that.
        name: draft.name?.trim() ? draft.name.trim() : null,
      })
      .select(BONDING_COLUMNS)
      .single();

    if (error) throw new Error(`Could not bond the Project: ${error.message}`);
    return toBonding(data as BondingRow);
  }

  async deleteBonding(bondingId: ProjectBondingId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("project_bondings")
      .delete()
      .eq("id", bondingId);

    if (error) throw new Error(`Could not unbond the Atom: ${error.message}`);
  }

  private async patchProject(
    projectId: ProjectId,
    values: Record<string, unknown>,
    verb: string,
  ): Promise<Project> {
    const { data, error } = await this.resolveClient()
      .from("projects")
      .update(values)
      .eq("id", projectId)
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Could not ${verb} the Project: ${error.message}`);
    }
    return toProject(data as ProjectRow);
  }

  private async patchEntry(
    entryId: DaylogEntryId,
    values: Record<string, unknown>,
    verb: string,
  ): Promise<DaylogEntry> {
    const { data, error } = await this.resolveClient()
      .from("daylog_entries")
      .update(values)
      .eq("id", entryId)
      .select(ENTRY_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Could not ${verb} the day: ${error.message}`);
    }
    return toEntry(data as EntryRow);
  }
}

import type {
  DaylogEntry,
  DaylogEntryDraft,
  DaylogEntryId,
  Project,
  ProjectDraft,
  ProjectId,
} from "./domain";
import type { ProjectRepository } from "./repository";

export interface FakeProjectRepositoryOptions {
  projects?: Project[];
  entries?: DaylogEntry[];
  /** What `publishEntry` stamps, so tests don't have to deal with real clocks. */
  now?: string;
}

/**
 * In-memory `ProjectRepository` for tests. Hands out copies so callers can't
 * mutate it by accident, and can be told to fail on demand.
 */
export class FakeProjectRepository implements ProjectRepository {
  private projects: Project[];
  private entries: DaylogEntry[];
  private now: string;
  private failure: Error | null = null;
  private nextId = 1;

  /** How many times `loadProjects` has been called. */
  loadCount = 0;

  constructor(options: FakeProjectRepositoryOptions = {}) {
    this.projects = [...(options.projects ?? [])];
    this.entries = [...(options.entries ?? [])];
    this.now = options.now ?? "2026-08-30T00:00:00.000Z";
  }

  async loadProjects(): Promise<Project[]> {
    this.loadCount += 1;
    if (this.failure) throw this.failure;
    return this.projects.map((project) => ({ ...project }));
  }

  async createProject(draft: ProjectDraft): Promise<Project> {
    if (this.failure) throw this.failure;
    const project: Project = {
      ...draft,
      id: `generated-project-${this.nextId++}`,
      deletedAt: null,
    };
    this.projects.push(project);
    return { ...project };
  }

  async updateProject(
    projectId: ProjectId,
    draft: ProjectDraft,
  ): Promise<Project> {
    if (this.failure) throw this.failure;
    const index = this.projects.findIndex(
      (project) => project.id === projectId,
    );
    if (index === -1) throw new Error(`No Project with id ${projectId}`);

    this.projects[index] = { ...this.projects[index], ...draft };
    return { ...this.projects[index] };
  }

  async trashProject(projectId: ProjectId): Promise<Project> {
    return this.rewriteProject(projectId, (project) => ({
      ...project,
      deletedAt: this.now,
    }));
  }

  async restoreProject(projectId: ProjectId): Promise<Project> {
    return this.rewriteProject(projectId, (project) => ({
      ...project,
      deletedAt: null,
    }));
  }

  private rewriteProject(
    projectId: ProjectId,
    change: (project: Project) => Project,
  ): Project {
    if (this.failure) throw this.failure;
    const index = this.projects.findIndex(
      (project) => project.id === projectId,
    );
    if (index === -1) throw new Error(`No Project with id ${projectId}`);

    this.projects[index] = change(this.projects[index]);
    return { ...this.projects[index] };
  }

  async loadEntries(): Promise<DaylogEntry[]> {
    if (this.failure) throw this.failure;
    return this.entries.map((entry) => ({ ...entry }));
  }

  async createEntry(
    projectId: ProjectId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry> {
    if (this.failure) throw this.failure;
    const sequence = this.nextId++;
    const entry: DaylogEntry = {
      ...draft,
      id: `generated-entry-${sequence}`,
      projectId,
      // Monotonic rather than a real clock, so two Entries written in the same
      // test tick still order the way two real writes would.
      createdAt: new Date(Date.parse(this.now) + sequence * 1000).toISOString(),
      // A new Entry is a draft. Publishing is its own call.
      publishedAt: null,
    };
    this.entries.push(entry);
    return { ...entry };
  }

  async updateEntry(
    entryId: DaylogEntryId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry> {
    // Spread the draft over the row rather than replacing it: `publishedAt` and
    // `createdAt` are the store of record's and a rewrite does not touch them.
    return this.rewriteEntry(entryId, (entry) => ({ ...entry, ...draft }));
  }

  async publishEntry(entryId: DaylogEntryId): Promise<DaylogEntry> {
    return this.rewriteEntry(entryId, (entry) => ({
      ...entry,
      publishedAt: this.now,
    }));
  }

  async deleteEntryForever(entryId: DaylogEntryId): Promise<void> {
    if (this.failure) throw this.failure;
    this.entries = this.entries.filter((entry) => entry.id !== entryId);
  }

  private rewriteEntry(
    entryId: DaylogEntryId,
    change: (entry: DaylogEntry) => DaylogEntry,
  ): DaylogEntry {
    if (this.failure) throw this.failure;
    const index = this.entries.findIndex((entry) => entry.id === entryId);
    if (index === -1) throw new Error(`No Daylog Entry with id ${entryId}`);

    this.entries[index] = change(this.entries[index]);
    return { ...this.entries[index] };
  }

  /** Make every subsequent call reject, until `failWith(null)` clears it. */
  failWith(error: Error | null): void {
    this.failure = error;
  }
}

import type {
  DaylogEntry,
  DaylogEntryDraft,
  DaylogEntryId,
  Project,
  ProjectBonding,
  ProjectBondingDraft,
  ProjectBondingId,
  ProjectDraft,
  ProjectId,
} from "./domain";

/**
 * Persistence seam for the Project store, the same shape the Sphere and the
 * Articles have: the store never talks to Supabase directly, writes return the
 * saved record, and the tests run against an in-memory fake.
 *
 * `loadProjects` and `loadEntries` return whatever the caller is allowed to
 * read — a Visitor never receives a Project with nothing published in it, and
 * never receives a draft Entry. That rule is the database's (RLS), not the
 * store's; the store holds the near side of the same rule.
 */
export interface ProjectRepository {
  loadProjects(): Promise<Project[]>;

  createProject(draft: ProjectDraft): Promise<Project>;

  updateProject(projectId: ProjectId, draft: ProjectDraft): Promise<Project>;

  /** Move a Project to the Trash. The row stays; `deletedAt` is stamped. */
  trashProject(projectId: ProjectId): Promise<Project>;

  /** Take a Project back out of the Trash. */
  restoreProject(projectId: ProjectId): Promise<Project>;

  /** Every Daylog Entry the reader may see, across every Project. */
  loadEntries(): Promise<DaylogEntry[]>;

  createEntry(
    projectId: ProjectId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry>;

  /**
   * Rewrite a Daylog Entry — its body, or the day it is filed under. This is
   * what autosave calls, so it must not touch `published_at`.
   */
  updateEntry(
    entryId: DaylogEntryId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntry>;

  /**
   * Publish a Daylog Entry. Stamps `publishedAt`; separate from `updateEntry`
   * precisely so that autosaving cannot publish by accident (ADR-0008).
   */
  publishEntry(entryId: DaylogEntryId): Promise<DaylogEntry>;

  /**
   * Remove a Daylog Entry for good. There is nothing after this — the Trash is
   * a Project-level idea, and a second one for single days is machinery nobody
   * would open (#35, decision 13).
   */
  deleteEntryForever(entryId: DaylogEntryId): Promise<void>;

  /**
   * Every Project-to-Atom Bonding the reader may see. Kept apart from
   * `loadProjects` because they are separate tables and the join is the
   * store's to make — ADR-0007's arrangement, unchanged.
   */
  loadBondings(): Promise<ProjectBonding[]>;

  createBonding(draft: ProjectBondingDraft): Promise<ProjectBonding>;

  deleteBonding(bondingId: ProjectBondingId): Promise<void>;
}

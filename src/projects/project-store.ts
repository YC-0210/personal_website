import {
  UnconfiguredAuthProvider,
  type AuthProvider,
  type OwnerSession,
} from "@/sphere/auth";
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
import { refusalFor } from "@/articles/article-image";
import {
  UnconfiguredImageStore,
  type ArticleImage,
  type ImageStore,
} from "@/articles/image-store";
import type { ProjectRepository } from "./repository";

export type ProjectStatus = "idle" | "loading" | "ready" | "error";

export interface ProjectState {
  status: ProjectStatus;
  projects: Project[];
  /** Every Daylog Entry the reader may see, across every Project. */
  entries: DaylogEntry[];
  /** Every Project-to-Atom Bonding, read in both directions. */
  bondings: ProjectBonding[];
  error: string | null;
  owner: OwnerSession | null;
  isEditMode: boolean;
  writeError: string | null;
}

export type ProjectListener = (state: ProjectState) => void;

/** One row of an Atom's Dossier: a Project, and how it touched that Atom. */
export interface BondedProject {
  project: Project;
  bonding: ProjectBonding;
}

const EMPTY_STATE: ProjectState = {
  status: "idle",
  projects: [],
  entries: [],
  bondings: [],
  error: null,
  owner: null,
  isEditMode: false,
  writeError: null,
};

/**
 * Owns Project and Daylog state, and is the only place that talks to the
 * Project repository — the same shape the Sphere and Article stores have.
 */
export class ProjectStore {
  private state: ProjectState = EMPTY_STATE;
  private readonly listeners = new Set<ProjectListener>();

  /**
   * The Image seam is the Articles module's, and is borrowed rather than
   * lifted out. That follows the precedent `DaylogEntryBody` already sets in
   * `domain.ts`: the type belongs to neither, it was written down in Articles
   * first, and it moves out when a *third* writer appears — not the second.
   */
  constructor(
    private readonly repository: ProjectRepository,
    private readonly auth: AuthProvider = new UnconfiguredAuthProvider(),
    private readonly images: ImageStore = new UnconfiguredImageStore(),
  ) {}

  getState(): ProjectState {
    return this.state;
  }

  subscribe(listener: ProjectListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async load(): Promise<void> {
    this.setState({ status: "loading", error: null });

    try {
      const [projects, entries, bondings] = await Promise.all([
        this.repository.loadProjects(),
        this.repository.loadEntries(),
        this.repository.loadBondings(),
      ]);
      this.setState({
        projects,
        entries,
        bondings,
        status: "ready",
        error: null,
      });
    } catch (cause) {
      this.setState({
        status: "error",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /**
   * The Projects this reader may see.
   *
   * For the Owner, every Project they have started. For everybody else, only
   * those with at least one live, published Daylog Entry in them — a Project
   * with nothing published is a name for work nobody can read yet, and
   * announcing it would be the ADR-0008 failure moved up a level (#35,
   * decision 7).
   *
   * Derived, never stored. There is no published flag on a Project to keep in
   * step with its Entries, so the two cannot disagree. For a Visitor the drafts
   * never left the database anyway; this is the near side of the RLS policy,
   * not a substitute for it.
   */
  projects(): Project[] {
    return this.state.projects
      .filter((project) => this.canRead(project))
      .sort((left, right) =>
        compareByLastLogged(
          this.lastLoggedOn(left.id),
          this.lastLoggedOn(right.id),
        ),
      );
  }

  /** One Project, by id, under exactly the rule `projects()` uses. */
  getProject(projectId: ProjectId): Project | undefined {
    return this.state.projects.find((project) => project.id === projectId);
  }

  /**
   * Start a Project. The id comes back because the Project exists before the
   * log does — the first Entry is written into a Project that is already there.
   */
  async addProject(draft: ProjectDraft): Promise<ProjectId> {
    let projectId = "";
    await this.write(async () => {
      const project = await this.repository.createProject(draft);
      projectId = project.id;
      this.setState({ projects: [...this.state.projects, project] });
    });
    return projectId;
  }

  /**
   * A Project's Daylog, as this reader may read it.
   *
   * The Owner sees their own drafts, so an unfinished day can be finished. A
   * Visitor sees published days only — the same rule `articles()` applies, and
   * the same rule that decides whether the Project is visible at all.
   */
  entries(projectId: ProjectId): DaylogEntry[] {
    return this.state.entries
      .filter(
        (entry) =>
          entry.projectId === projectId &&
          (entry.publishedAt !== null || this.readsDrafts()),
      )
      .sort(byNewestDay);
  }

  /**
   * Write a Daylog Entry into a Project. It is saved as a draft and nobody but
   * the Owner can read it; publishing is a separate act (ADR-0008).
   */
  async addEntry(
    projectId: ProjectId,
    draft: DaylogEntryDraft,
  ): Promise<DaylogEntryId> {
    let entryId = "";
    await this.write(async () => {
      const entry = await this.repository.createEntry(projectId, draft);
      entryId = entry.id;
      this.setState({ entries: [...this.state.entries, entry] });
    });
    return entryId;
  }

  /**
   * The day a Project was last logged: the date of its newest live, published
   * Daylog Entry, or null if nothing in it has been published.
   *
   * Derived at read time and **never stored** (#35, decision 8). A column
   * holding this would go stale the instant an Entry were unpublished or its
   * Project trashed — which is exactly how `hours_spent` failed, and #30 spent
   * a whole ticket removing that.
   *
   * Published-only, so it is the same date for every reader. Deliberately not
   * the rule `entries()` uses: that one answers "what may this reader open",
   * and includes the Owner's drafts. This one answers "when was this last
   * worked on in public", and a Projects list that reordered itself when the
   * Owner signed in would be a list they were tuning for nobody.
   */
  lastLoggedOn(projectId: ProjectId): string | null {
    let latest: string | null = null;
    for (const entry of this.state.entries) {
      if (entry.projectId !== projectId) continue;
      if (entry.publishedAt === null) continue;
      if (latest === null || entry.date > latest) latest = entry.date;
    }
    return latest;
  }

  /**
   * Remove one day from the Daylog for good.
   *
   * Deliberately not a soft delete. The Trash protects a Project — months of
   * logged work — and a second Trash holding single days is machinery nobody
   * opens (#35, decision 13). The two-step confirm in front of this is what
   * makes it safe, not a row that lingers.
   */
  async destroyEntry(entryId: DaylogEntryId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteEntryForever(entryId);
      this.setState({
        entries: this.state.entries.filter((entry) => entry.id !== entryId),
      });
    });
  }

  /** Rewrite a Project's name and description. Its Daylog is untouched. */
  async editProject(projectId: ProjectId, draft: ProjectDraft): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.updateProject(projectId, draft));
    });
  }

  /** What the Owner sees in the Trash: every Project they have deleted. */
  trash(): Project[] {
    return this.state.projects.filter((project) => project.deletedAt !== null);
  }

  /**
   * Move a Project to the Trash. It leaves every list at once and the row stays
   * put — months of logged work is not something to lose to one click.
   */
  async deleteProject(projectId: ProjectId): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.trashProject(projectId));
    });
  }

  /** Take a Project back out of the Trash, log and all. */
  async restoreProject(projectId: ProjectId): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.restoreProject(projectId));
    });
  }

  /**
   * Rewrite a Daylog Entry. This is what autosave calls, so it must never
   * change whether the Entry is published — a draft stays a draft however many
   * times it is saved, and revising a published day does not withdraw it. That
   * invariant is ADR-0008's, and it is held here rather than in the editor.
   */
  /**
   * Put a picture in a day and say where to point at it.
   *
   * Filed under the *Entry* rather than the Project: a picture belongs to the
   * day it records, and a Project can hold years of them. The document is not
   * touched here — the editor holds the body and is the one that can put a
   * picture at the caret — so this returns the URL and lets it. Autosave
   * writes the result out like any other edit.
   */
  async uploadImage(entryId: DaylogEntryId, file: File): Promise<ArticleImage> {
    let image: ArticleImage | null = null;
    await this.write(async () => {
      const refusal = refusalFor(file);
      if (refusal) throw new Error(refusal);

      image = await this.images.upload(entryId, file);
    });
    return image!;
  }

  async editEntry(
    entryId: DaylogEntryId,
    draft: DaylogEntryDraft,
  ): Promise<void> {
    await this.write(async () => {
      this.replaceEntry(await this.repository.updateEntry(entryId, draft));
    });
  }

  /** Publish a Daylog Entry. The one deliberate act that makes a day public. */
  async publishEntry(entryId: DaylogEntryId): Promise<void> {
    await this.write(async () => {
      this.replaceEntry(await this.repository.publishEntry(entryId));
    });
  }

  /**
   * Bond this Project to an Atom: the work touched that topic.
   *
   * No Name is required (#35, decision 5). Bonding at all is optional — a
   * Project that draws on nothing in the Sphere is a perfectly good Project.
   */
  async addBonding(draft: ProjectBondingDraft): Promise<void> {
    await this.write(async () => {
      // One pair, one Bonding — the schema enforces it with a unique index, and
      // catching it here turns a constraint name into a sentence.
      const alreadyBonded = this.state.bondings.some(
        (bonding) =>
          bonding.projectId === draft.projectId &&
          bonding.atomId === draft.atomId,
      );
      if (alreadyBonded) {
        throw new Error("That Project and Atom are already bonded.");
      }

      const bonding = await this.repository.createBonding(draft);
      this.setState({ bondings: [...this.state.bondings, bonding] });
    });
  }

  /** Unbond a Project from an Atom. Neither of them is otherwise touched. */
  async deleteBonding(bondingId: ProjectBondingId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteBonding(bondingId);
      this.setState({
        bondings: this.state.bondings.filter(
          (bonding) => bonding.id !== bondingId,
        ),
      });
    });
  }

  /** The Atoms this Project is bonded to — the Project → Atom read. */
  bondingsForProject(projectId: ProjectId): ProjectBonding[] {
    return this.state.bondings.filter(
      (bonding) => bonding.projectId === projectId,
    );
  }

  /**
   * The Projects bonded to this Atom, each with the Bonding — the Atom →
   * Project read, which is what an Atom's Dossier lists under "WORKED ON".
   *
   * Goes through the same read rule `projects()` uses, so a Project with
   * nothing published, or one in the Trash, cannot reach a Visitor by this
   * route either. An Atom's panel is a second way in, not a second rule.
   */
  bondedProjects(atomId: string): BondedProject[] {
    const bonded: BondedProject[] = [];
    for (const bonding of this.state.bondings) {
      if (bonding.atomId !== atomId) continue;
      const project = this.state.projects.find(
        (candidate) => candidate.id === bonding.projectId,
      );
      if (project && this.canRead(project)) bonded.push({ project, bonding });
    }
    return bonded;
  }

  /**
   * Pick up a session the Owner already had, and keep following it if it goes
   * away on its own. Returns the unsubscribe for the session listener.
   */
  async restoreSession(): Promise<() => void> {
    const unsubscribe = this.auth.onSessionChange((session) => {
      this.setState({ owner: session, isEditMode: session !== null });
    });

    try {
      const session = await this.auth.currentSession();
      this.setState({ owner: session, isEditMode: session !== null });
    } catch {
      this.setState({ owner: null, isEditMode: false });
    }

    return unsubscribe;
  }

  /**
   * Whether this reader may see this Project at all. The Owner may see every
   * Project; anybody else needs one published Entry in it.
   */
  private canRead(project: Project): boolean {
    if (project.deletedAt !== null) return false;
    if (this.readsDrafts()) return true;
    return this.state.entries.some(
      (entry) => entry.projectId === project.id && entry.publishedAt !== null,
    );
  }

  /**
   * Whether the reader may see drafts at all. Only the Owner may, and only
   * because they wrote them — this is not a permission the UI can pass in.
   */
  private readsDrafts(): boolean {
    return this.state.owner !== null;
  }

  /**
   * The common shape of every Owner write: refuse it outright unless Edit Mode
   * is on, and record why it failed if it did. Supabase's RLS policies are what
   * actually keep a Visitor out; this is the near side of that same rule.
   */
  private async write(operation: () => Promise<void>): Promise<void> {
    try {
      if (!this.state.isEditMode) {
        throw new Error("Edit Mode is required to change a Project.");
      }
      this.setState({ writeError: null });
      await operation();
    } catch (cause) {
      this.setState({
        writeError: cause instanceof Error ? cause.message : String(cause),
      });
      throw cause;
    }
  }

  /** Put the saved form of a Daylog Entry back in place of the one held. */
  private replaceEntry(saved: DaylogEntry): void {
    this.setState({
      entries: this.state.entries.map((entry) =>
        entry.id === saved.id ? saved : entry,
      ),
    });
  }

  /** Put the saved form of a Project back in place of the one held. */
  private replace(saved: Project): void {
    this.setState({
      projects: this.state.projects.map((project) =>
        project.id === saved.id ? saved : project,
      ),
    });
  }

  private setState(patch: Partial<ProjectState>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }
}

/**
 * Newest last-logged day first, with never-logged Projects ahead of all of them.
 *
 * A Project with nothing published has no date to sort by, and that absence is
 * information: it is work in progress, and it is what the Owner is most likely
 * to be looking for (#35, decision 9). Only the Owner ever sees one — a Visitor
 * cannot see such a Project at all — so this branch never reorders their list.
 */
function compareByLastLogged(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left < right ? 1 : -1;
}

/**
 * Newest day first, and within one day the later write first.
 *
 * Two Entries may carry the same date on purpose (#35, decision 12), so `date`
 * alone is not a total order and a sort on it would leave the pair in whatever
 * order the rows arrived. `createdAt` is the tie-break, and it is the only
 * thing it is for.
 */
function byNewestDay(left: DaylogEntry, right: DaylogEntry): number {
  if (left.date !== right.date) return left.date < right.date ? 1 : -1;
  return left.createdAt < right.createdAt ? 1 : -1;
}

export function createProjectStore(
  repository: ProjectRepository,
  auth?: AuthProvider,
  images?: ImageStore,
): ProjectStore {
  return new ProjectStore(repository, auth, images);
}

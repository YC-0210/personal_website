/**
 * The vocabulary of the Project Daylog.
 *
 * A Project is a body of the Owner's work. Its Daylog is the raw, dated record
 * of doing that work — kept apart from the Articles on purpose (issue #35): an
 * Article is finished writing, a Daylog Entry is not.
 */

import type { ArticleBody } from "@/articles/domain";

export type ProjectId = string;
export type DaylogEntryId = string;

/**
 * A Daylog Entry's body is the same rich document an Article's is — Tiptap's
 * own JSON, so the writing surface, the extensions and the safety argument from
 * ADR-0008's decision 8 are shared rather than reimplemented.
 *
 * Named through the Article's type because that is where it was first written
 * down. The type is structural and belongs to neither; if a third writer ever
 * appears it should be lifted out of both.
 */
export type DaylogEntryBody = ArticleBody;

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  /**
   * When the Owner moved this Project to the Trash, or null while it is live.
   * Work logged over months should be undoable, so deleting marks rather than
   * removes — the same rule an Article carries.
   */
  deletedAt: string | null;
}

/** What the Owner supplies. The id and the Trash state are the store's. */
export type ProjectDraft = Pick<Project, "name" | "description">;

/**
 * One dated record in a Project's Daylog.
 *
 * No title, deliberately: the date is the heading, and a log entry's first line
 * is its title. Written as a draft and published deliberately, exactly as an
 * Article is and for the same reason — autosave under publish-on-save would put
 * half-typed text in public (ADR-0008).
 */
export interface DaylogEntry {
  id: DaylogEntryId;
  projectId: ProjectId;
  /**
   * The day the work happened, as `YYYY-MM-DD`, set by the Owner. A date rather
   * than a timestamp: a Daylog Entry is about a day, and the time of day it was
   * typed up is not information anybody wants.
   */
  date: string;
  body: DaylogEntryBody;
  /**
   * When the row was written. The store of record's, never the Owner's — its
   * only job is to break a tie between two Entries carrying the same `date`,
   * which is allowed on purpose (#35, decision 12): you write in the morning
   * and learn something else at night.
   */
  createdAt: string;
  /** When the Owner published this Entry, or null while it is still a draft. */
  publishedAt: string | null;
}

/** What the Owner supplies. The id and the published state are the store's. */
export type DaylogEntryDraft = Pick<DaylogEntry, "date" | "body">;

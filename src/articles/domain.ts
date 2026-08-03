/**
 * The vocabulary of the Articles page.
 *
 * An Article is a piece of the Owner's writing, published the moment it is
 * saved. Deleting one moves it to the Trash rather than removing it — a
 * soft delete the Owner can undo.
 */

export type ArticleId = string;

export interface Article {
  id: ArticleId;
  title: string;
  body: string;
  /**
   * When the Owner moved this Article to the Trash, or null while it is live.
   * A Visitor never sees a trashed Article; the Owner can restore it or delete
   * it for good.
   */
  deletedAt: string | null;
}

/** What the Owner supplies. The id and the Trash state are the store's. */
export type ArticleDraft = Pick<Article, "title" | "body">;

export type BondingId = string;

/**
 * A Bonding joins one Article to one Atom and says, in the Owner's words, how
 * that Atom feeds into that Article — "How classical physics connects to
 * economics". Both directions are read: an Atom's Dossier lists the Articles
 * bonded to it, and an Article lists the Atoms it draws on.
 *
 * The Name is the whole point, exactly as a Connection's Explanation is: a
 * Bonding with no Name is an unexplained line between two things, so the store
 * refuses to save one.
 */
export interface Bonding {
  id: BondingId;
  articleId: ArticleId;
  /** The Atom this Article draws on. Ids only — Atoms belong to the Sphere. */
  atomId: string;
  name: string;
}

/** What the Owner supplies when bonding. The id is the store of record's. */
export type BondingDraft = Omit<Bonding, "id">;

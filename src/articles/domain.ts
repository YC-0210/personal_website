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

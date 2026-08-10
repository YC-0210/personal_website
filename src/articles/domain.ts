/**
 * The vocabulary of the Articles page.
 *
 * An Article is a piece of the Owner's writing, published the moment it is
 * saved. Deleting one moves it to the Trash rather than removing it — a
 * soft delete the Owner can undo.
 */

export type ArticleId = string;

/**
 * One node of a Tiptap document — a paragraph, a heading, a list, or the text
 * inside them. Structural only: what a node is *allowed* to be is decided by
 * the extensions the editor enables, not by this type.
 */
export interface ArticleBodyNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  content?: ArticleBodyNode[];
}

/**
 * An Article's body, stored as Tiptap's own JSON document rather than HTML
 * (decision 8 on #28). Safety by construction: markup the editor cannot produce
 * is not stripped on the way in, it is not representable at all — which is what
 * makes a paste from someone else's page harmless.
 */
export interface ArticleBody {
  type: "doc";
  content?: ArticleBodyNode[];
}

export interface Article {
  id: ArticleId;
  title: string;
  body: ArticleBody;
  /**
   * When the Owner moved this Article to the Trash, or null while it is live.
   * A Visitor never sees a trashed Article; the Owner can restore it or delete
   * it for good.
   */
  deletedAt: string | null;
  /**
   * When the Owner published this Article, or null while it is still a draft.
   *
   * Independent of `deletedAt`: an Article can be a published one in the Trash,
   * or a draft in the Trash, and every read path has to say which side of both
   * axes it wants. See ADR-0008, which amends ADR-0006's publish-on-save.
   */
  publishedAt: string | null;
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

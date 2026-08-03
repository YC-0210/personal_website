import type {
  Article,
  ArticleDraft,
  ArticleId,
  Bonding,
  BondingDraft,
  BondingId,
} from "./domain";

/**
 * Persistence seam for the Article store, the same shape the Sphere's
 * repository has: the store never talks to Supabase directly, writes return
 * the saved record, and the tests run against an in-memory fake.
 *
 * `loadArticles` returns whatever the caller is allowed to read — a Visitor
 * sees only live Articles, the Owner sees the Trash as well. That rule is the
 * database's (RLS), not the store's; the store only sorts what arrives.
 */
export interface ArticleRepository {
  loadArticles(): Promise<Article[]>;

  createArticle(draft: ArticleDraft): Promise<Article>;

  updateArticle(articleId: ArticleId, draft: ArticleDraft): Promise<Article>;

  /** Move an Article to the Trash. The row stays; `deletedAt` is stamped. */
  trashArticle(articleId: ArticleId): Promise<Article>;

  /** Take an Article back out of the Trash. */
  restoreArticle(articleId: ArticleId): Promise<Article>;

  /** Remove the row for good. There is nothing after this. */
  deleteArticleForever(articleId: ArticleId): Promise<void>;

  /**
   * Every Bonding the reader is allowed to see. Kept apart from `loadArticles`
   * because the two are separate tables and the join is the store's to make.
   */
  loadBondings(): Promise<Bonding[]>;

  /** Persist a new Bonding and return it with its assigned id. */
  createBonding(draft: BondingDraft): Promise<Bonding>;

  /** Unbond an Article from an Atom. Neither of them is touched. */
  deleteBonding(bondingId: BondingId): Promise<void>;
}

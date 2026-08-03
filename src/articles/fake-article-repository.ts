import type { Article, ArticleDraft, ArticleId } from "./domain";
import type { ArticleRepository } from "./repository";

export interface FakeArticleRepositoryOptions {
  articles?: Article[];
  /** What `trashArticle` stamps, so tests don't have to deal with real clocks. */
  now?: string;
}

/**
 * In-memory `ArticleRepository` for tests. Hands out copies so callers can't
 * mutate it by accident, and can be told to fail on demand.
 */
export class FakeArticleRepository implements ArticleRepository {
  private articles: Article[];
  private readonly now: string;
  private failure: Error | null = null;
  private nextId = 1;

  /** How many times `loadArticles` has been called. */
  loadCount = 0;

  constructor(options: FakeArticleRepositoryOptions = {}) {
    this.articles = [...(options.articles ?? [])];
    this.now = options.now ?? "2026-08-02T00:00:00.000Z";
  }

  async loadArticles(): Promise<Article[]> {
    this.loadCount += 1;
    if (this.failure) throw this.failure;
    return this.articles.map((article) => ({ ...article }));
  }

  async createArticle(draft: ArticleDraft): Promise<Article> {
    if (this.failure) throw this.failure;
    const article: Article = {
      ...draft,
      id: `generated-article-${this.nextId++}`,
      deletedAt: null,
    };
    this.articles.push(article);
    return { ...article };
  }

  async updateArticle(
    articleId: ArticleId,
    draft: ArticleDraft,
  ): Promise<Article> {
    return this.rewrite(articleId, (article) => ({ ...article, ...draft }));
  }

  async trashArticle(articleId: ArticleId): Promise<Article> {
    return this.rewrite(articleId, (article) => ({
      ...article,
      deletedAt: this.now,
    }));
  }

  async restoreArticle(articleId: ArticleId): Promise<Article> {
    return this.rewrite(articleId, (article) => ({
      ...article,
      deletedAt: null,
    }));
  }

  async deleteArticleForever(articleId: ArticleId): Promise<void> {
    if (this.failure) throw this.failure;
    this.articles = this.articles.filter((article) => article.id !== articleId);
  }

  /** Replace the stored rows, as if something changed behind the store's back. */
  setArticles(articles: Article[]): void {
    this.articles = [...articles];
  }

  /** Make every subsequent call reject, until `failWith(null)` clears it. */
  failWith(error: Error | null): void {
    this.failure = error;
  }

  private async rewrite(
    articleId: ArticleId,
    change: (article: Article) => Article,
  ): Promise<Article> {
    if (this.failure) throw this.failure;
    const index = this.articles.findIndex(
      (article) => article.id === articleId,
    );
    if (index === -1) throw new Error(`No Article with id ${articleId}`);

    this.articles[index] = change(this.articles[index]);
    return { ...this.articles[index] };
  }
}

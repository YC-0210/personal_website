import {
  UnconfiguredAuthProvider,
  type AuthProvider,
  type OwnerSession,
} from "@/sphere/auth";
import type { Article, ArticleDraft, ArticleId } from "./domain";
import type { ArticleRepository } from "./repository";

export type ArticleStatus = "idle" | "loading" | "ready" | "error";

export interface ArticleState {
  status: ArticleStatus;
  /** Every Article the reader is allowed to see, Trash included for the Owner. */
  articles: Article[];
  error: string | null;
  owner: OwnerSession | null;
  isEditMode: boolean;
  writeError: string | null;
}

export type ArticleListener = (state: ArticleState) => void;

const EMPTY_STATE: ArticleState = {
  status: "idle",
  articles: [],
  error: null,
  owner: null,
  isEditMode: false,
  writeError: null,
};

/**
 * Owns Article state and is the only place that talks to the Article
 * repository — the same shape as the Sphere store, for the same reasons.
 *
 * Articles publish on save. There is no draft/publish step, exactly as there is
 * none for Atoms and Connections; see ADR-0006.
 */
export class ArticleStore {
  private state: ArticleState = EMPTY_STATE;
  private readonly listeners = new Set<ArticleListener>();

  constructor(
    private readonly repository: ArticleRepository,
    private readonly auth: AuthProvider = new UnconfiguredAuthProvider(),
  ) {}

  getState(): ArticleState {
    return this.state;
  }

  subscribe(listener: ArticleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async load(): Promise<void> {
    this.setState({ status: "loading", error: null });

    try {
      const articles = await this.repository.loadArticles();
      this.setState({ articles, status: "ready", error: null });
    } catch (cause) {
      this.setState({
        status: "error",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /** What a Visitor reads: every Article that is not in the Trash. */
  articles(): Article[] {
    return this.state.articles.filter((article) => article.deletedAt === null);
  }

  /**
   * One Article to read in full. A trashed Article is not readable by id
   * either — the Trash is a way out of the site, not just off the list.
   */
  getArticle(articleId: ArticleId): Article | undefined {
    return this.articles().find((article) => article.id === articleId);
  }

  /** Write a new Article. It is public the moment this resolves. */
  async addArticle(draft: ArticleDraft): Promise<void> {
    await this.write(async () => {
      const article = await this.repository.createArticle(draft);
      this.setState({ articles: [...this.state.articles, article] });
    });
  }

  /** Rewrite an Article. The change is public as soon as it saves. */
  async editArticle(articleId: ArticleId, draft: ArticleDraft): Promise<void> {
    await this.write(async () => {
      const saved = await this.repository.updateArticle(articleId, draft);
      this.replace(saved);
    });
  }

  /** What the Owner sees in the Trash: every Article they have deleted. */
  trash(): Article[] {
    return this.state.articles.filter((article) => article.deletedAt !== null);
  }

  /**
   * Move an Article to the Trash. It leaves the public list at once, and the
   * row stays put — deleting a piece of writing outright is not something the
   * Owner should be able to do by accident.
   */
  async deleteArticle(articleId: ArticleId): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.trashArticle(articleId));
    });
  }

  /** Take an Article back out of the Trash. It is public again immediately. */
  async restoreArticle(articleId: ArticleId): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.restoreArticle(articleId));
    });
  }

  /**
   * Empty one Article out of the Trash for good. Deliberately separate from
   * `deleteArticle`: this is the one that cannot be walked back.
   */
  async destroyArticle(articleId: ArticleId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteArticleForever(articleId);
      this.setState({
        articles: this.state.articles.filter(
          (article) => article.id !== articleId,
        ),
      });
    });
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
   * The common shape of every Owner write: refuse it outright unless Edit Mode
   * is on, and record why it failed if it did. Supabase's RLS policies are what
   * actually keep a Visitor out; this is the near side of that same rule.
   */
  private async write(operation: () => Promise<void>): Promise<void> {
    try {
      if (!this.state.isEditMode) {
        throw new Error("Edit Mode is required to change an Article.");
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

  /** Put the saved form of an Article back in place of the one held. */
  private replace(saved: Article): void {
    this.setState({
      articles: this.state.articles.map((article) =>
        article.id === saved.id ? saved : article,
      ),
    });
  }

  private setState(patch: Partial<ArticleState>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }
}

export function createArticleStore(
  repository: ArticleRepository,
  auth?: AuthProvider,
): ArticleStore {
  return new ArticleStore(repository, auth);
}

import {
  UnconfiguredAuthProvider,
  type AuthProvider,
  type OwnerSession,
} from "@/sphere/auth";
import { EMPTY_BODY } from "./article-body";
import { refusalFor } from "./article-image";
import {
  UnconfiguredImageStore,
  type ArticleImage,
  type ImageStore,
} from "./image-store";
import type {
  Article,
  ArticleDraft,
  ArticleId,
  Bonding,
  BondingDraft,
  BondingId,
} from "./domain";
import type { ArticleRepository } from "./repository";

/** What a draft is called before the Owner has titled it. */
const UNTITLED = "Untitled";

export type ArticleStatus = "idle" | "loading" | "ready" | "error";

export interface ArticleState {
  status: ArticleStatus;
  /** Every Article the reader is allowed to see, Trash included for the Owner. */
  articles: Article[];
  /** Every Article-to-Atom Bonding, read in both directions. */
  bondings: Bonding[];
  error: string | null;
  owner: OwnerSession | null;
  isEditMode: boolean;
  writeError: string | null;
}

export type ArticleListener = (state: ArticleState) => void;

/** One row of an Atom's Dossier: an Article, and why it draws on that Atom. */
export interface BondedArticle {
  article: Article;
  bonding: Bonding;
}

const EMPTY_STATE: ArticleState = {
  status: "idle",
  articles: [],
  bondings: [],
  error: null,
  owner: null,
  isEditMode: false,
  writeError: null,
};

/**
 * Owns Article state and is the only place that talks to the Article
 * repository — the same shape as the Sphere store, for the same reasons.
 *
 * An Article is written as a draft and published deliberately — ADR-0008, which
 * amends ADR-0006's publish-on-save. `deletedAt` and `publishedAt` are two
 * independent axes, so every read path here says which side of *both* it wants
 * rather than leaving one implied.
 */
export class ArticleStore {
  private state: ArticleState = EMPTY_STATE;
  private readonly listeners = new Set<ArticleListener>();

  constructor(
    private readonly repository: ArticleRepository,
    private readonly auth: AuthProvider = new UnconfiguredAuthProvider(),
    private readonly images: ImageStore = new UnconfiguredImageStore(),
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
      const [articles, bondings] = await Promise.all([
        this.repository.loadArticles(),
        this.repository.loadBondings(),
      ]);
      this.setState({ articles, bondings, status: "ready", error: null });
    } catch (cause) {
      this.setState({
        status: "error",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /**
   * The Articles the reader in front of us may read: out of the Trash, and
   * published unless that reader is the Owner, who also sees their own drafts
   * so they can be finished.
   *
   * Both axes are answered here deliberately — `deletedAt` and `publishedAt`
   * are independent, so "not deleted" is only half an answer (ADR-0008). For a
   * Visitor the drafts never left the database anyway; this is the near side of
   * the RLS policy, not a substitute for it.
   */
  articles(): Article[] {
    return this.state.articles.filter(
      (article) =>
        article.deletedAt === null &&
        (article.publishedAt !== null || this.readsDrafts()),
    );
  }

  /**
   * One Article to read in full, under exactly the rule `articles()` uses: a
   * trashed one is not readable by id either, and neither is someone else's
   * draft — the Trash is a way out of the site, and a draft has not entered it.
   */
  getArticle(articleId: ArticleId): Article | undefined {
    return this.articles().find((article) => article.id === articleId);
  }

  /**
   * Start an Article. It is saved as a draft and nobody but the Owner can read
   * it; publishing is a separate act. The id comes back because the draft
   * exists before the writing does — the editor is always `/articles/<id>/edit`.
   */
  async addArticle(draft: ArticleDraft): Promise<ArticleId> {
    let articleId = "";
    await this.write(async () => {
      const article = await this.repository.createArticle(draft);
      articleId = article.id;
      this.setState({ articles: [...this.state.articles, article] });
    });
    return articleId;
  }

  /**
   * Rewrite an Article. This is what autosave calls, so it must never change
   * whether the Article is published — a draft stays a draft however many times
   * it is saved, which is the whole point of ADR-0008.
   */
  async editArticle(articleId: ArticleId, draft: ArticleDraft): Promise<void> {
    await this.write(async () => {
      const saved = await this.repository.updateArticle(articleId, draft);
      this.replace(saved);
    });
  }

  /**
   * Put an Image in an Article and say where to point at it.
   *
   * The document is not touched here — the editor holds the body and is the
   * one that can put a picture at the caret, so this returns the URL and lets
   * it. Autosave writes the result out like any other edit.
   *
   * The file is judged before it is sent, so an Owner who picks the wrong
   * thing is told immediately rather than after waiting for an upload the
   * bucket was always going to refuse.
   */
  async uploadImage(articleId: ArticleId, file: File): Promise<ArticleImage> {
    let image: ArticleImage | null = null;
    await this.write(async () => {
      const refusal = refusalFor(file);
      if (refusal) throw new Error(refusal);

      image = await this.images.upload(articleId, file);
    });
    return image!;
  }

  /** Publish a draft. The one deliberate act that makes writing public. */
  async publishArticle(articleId: ArticleId): Promise<void> {
    await this.write(async () => {
      this.replace(await this.repository.publishArticle(articleId));
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
      // The `on delete cascade` on `bondings.article_id` is the database's; it
      // is mirrored here so no Atom's Dossier briefly lists an Article that has
      // already gone.
      this.setState({
        articles: this.state.articles.filter(
          (article) => article.id !== articleId,
        ),
        bondings: this.state.bondings.filter(
          (bonding) => bonding.articleId !== articleId,
        ),
      });
    });
  }

  /**
   * Bond this Article to an Atom, saying how that Atom feeds into it.
   */
  async addBonding(draft: BondingDraft): Promise<void> {
    await this.write(async () => {
      requireBondingName(draft.name);

      // One pair, one Bonding — the schema enforces it with a unique index, and
      // catching it here turns a constraint name into a sentence. Saying the
      // same thing twice about the same pair is an edit, not a second bond.
      const alreadyBonded = this.state.bondings.some(
        (bonding) =>
          bonding.articleId === draft.articleId &&
          bonding.atomId === draft.atomId,
      );
      if (alreadyBonded) {
        throw new Error("That Article and Atom are already bonded.");
      }

      const bonding = await this.repository.createBonding(draft);
      this.setState({ bondings: [...this.state.bondings, bonding] });
    });
  }

  /**
   * Start an Article from an Atom: one gesture, one draft, one Bonding.
   *
   * The Bonding is made now rather than at publish (decision 6 on #28) — an
   * "intended Atom" converted later would be a second, parallel concept that
   * skips the Name invariant and adds a step that can fail. What keeps the
   * draft's bond off a Visitor's Dossier is the read rule, not its absence.
   */
  async startArticleBondedTo(bond: {
    atomId: string;
    name: string;
  }): Promise<ArticleId> {
    let articleId = "";
    await this.write(async () => {
      // Before anything is written: a nameless bond must not leave an untitled
      // draft stranded behind it, which is what makes this one gesture and not
      // two that can half-fail.
      requireBondingName(bond.name);

      const article = await this.repository.createArticle({
        title: UNTITLED,
        body: EMPTY_BODY,
      });
      const bonding = await this.repository.createBonding({
        articleId: article.id,
        atomId: bond.atomId,
        name: bond.name,
      });

      articleId = article.id;
      this.setState({
        articles: [...this.state.articles, article],
        bondings: [...this.state.bondings, bonding],
      });
    });
    return articleId;
  }

  /**
   * Reword a Bonding. The Article and the Atom are untouched — this changes
   * only the sentence that says how one feeds into the other.
   */
  async editBonding(bondingId: BondingId, name: string): Promise<void> {
    await this.write(async () => {
      requireBondingName(name);
      const saved = await this.repository.updateBonding(bondingId, name);
      this.setState({
        bondings: this.state.bondings.map((bonding) =>
          bonding.id === saved.id ? saved : bonding,
        ),
      });
    });
  }

  /** Unbond an Article from an Atom. Neither of them is otherwise touched. */
  async deleteBonding(bondingId: BondingId): Promise<void> {
    await this.write(async () => {
      await this.repository.deleteBonding(bondingId);
      this.setState({
        bondings: this.state.bondings.filter(
          (bonding) => bonding.id !== bondingId,
        ),
      });
    });
  }

  /** The Atoms this Article is bonded to — the Article → Atom read. */
  bondingsForArticle(articleId: ArticleId): Bonding[] {
    return this.state.bondings.filter(
      (bonding) => bonding.articleId === articleId,
    );
  }

  /**
   * The Articles bonded to this Atom, each with the Bonding that explains it —
   * the Atom → Article read, which is what an Atom's Dossier lists.
   */
  bondedArticles(atomId: string): BondedArticle[] {
    const bonded: BondedArticle[] = [];
    for (const bonding of this.state.bondings) {
      if (bonding.atomId !== atomId) continue;
      const article = this.getArticle(bonding.articleId);
      if (article) bonded.push({ article, bonding });
    }
    return bonded;
  }

  /**
   * How many Articles have been written about each Atom: the count the Sphere
   * reads for an Atom's moons and for its Rank (issue #30).
   *
   * Live, published, bonded — and deliberately *not* the rule `bondedArticles()`
   * uses. That one answers "what may this reader open", so it includes the
   * Owner's own drafts. This one answers "what has been written about this
   * Atom", and has to give everybody the same answer: moons and Rank both hang
   * off it, so a reader-dependent count would resize Atoms and move orbits the
   * moment the Owner signed in, leaving them tuning a Sphere no Visitor sees.
   *
   * Atoms with nothing written about them are absent rather than zero. The
   * Sphere reads a missing count as none, and listing every Atom here would
   * mean this store knowing what Atoms exist, which is the Sphere's to know.
   */
  publishedBondedCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const bonding of this.state.bondings) {
      const article = this.state.articles.find(
        (candidate) => candidate.id === bonding.articleId,
      );
      if (!article) continue;
      if (article.deletedAt !== null || article.publishedAt === null) continue;
      counts[bonding.atomId] = (counts[bonding.atomId] ?? 0) + 1;
    }
    return counts;
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

  /**
   * Whether the reader may see drafts at all. Only the Owner may, and only
   * because they wrote them — this is not a permission the UI can pass in.
   */
  private readsDrafts(): boolean {
    return this.state.owner !== null;
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

/**
 * A Bonding has to say *how* the Atom feeds into the Article. That sentence is
 * the Name, and it is the same rule a Connection's Explanation carries: without
 * it the bond is a line between two things with no knowledge on it.
 *
 * Enforced here rather than only in the form, so no caller can route around it.
 */
function requireBondingName(name: string): void {
  if (name.trim() === "") {
    throw new Error(
      "A Bonding needs a Name: how this Atom feeds into this Article.",
    );
  }
}

export function createArticleStore(
  repository: ArticleRepository,
  auth?: AuthProvider,
  images?: ImageStore,
): ArticleStore {
  return new ArticleStore(repository, auth, images);
}

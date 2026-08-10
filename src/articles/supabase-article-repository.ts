import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  Article,
  ArticleBody,
  ArticleDraft,
  ArticleId,
  Bonding,
  BondingDraft,
  BondingId,
} from "./domain";
import type { ArticleRepository } from "./repository";

const ARTICLE_COLUMNS = "id, title, body, deleted_at, published_at";
const BONDING_COLUMNS = "id, article_id, atom_id, name";

interface ArticleRow {
  id: string;
  title: string;
  /** `jsonb`, so this arrives already parsed — a Tiptap document, not a string. */
  body: ArticleBody;
  deleted_at: string | null;
  published_at: string | null;
}

interface BondingRow {
  id: string;
  article_id: string;
  atom_id: string;
  name: string;
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    deletedAt: row.deleted_at,
    publishedAt: row.published_at,
  };
}

function toBonding(row: BondingRow): Bonding {
  return {
    id: row.id,
    articleId: row.article_id,
    atomId: row.atom_id,
    name: row.name,
  };
}

function fromDraft(draft: ArticleDraft) {
  return { title: draft.title, body: draft.body };
}

/**
 * The real `ArticleRepository`, backed by Postgres through Supabase.
 *
 * The Trash is a `deleted_at` timestamp and a draft is a null `published_at`,
 * and the RLS policies are what decide who sees either: a Visitor's select is
 * filtered to live, published rows in the database, so neither the Trash nor a
 * draft is ever on the wire for them at all.
 */
export class SupabaseArticleRepository implements ArticleRepository {
  private readonly resolveClient: () => SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.resolveClient = client ? () => client : getSupabaseClient;
  }

  async loadArticles(): Promise<Article[]> {
    const { data, error } = await this.resolveClient()
      .from("articles")
      .select(ARTICLE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Could not load the Articles: ${error.message}`);
    return (data as ArticleRow[]).map(toArticle);
  }

  async createArticle(draft: ArticleDraft): Promise<Article> {
    const { data, error } = await this.resolveClient()
      .from("articles")
      .insert(fromDraft(draft))
      .select(ARTICLE_COLUMNS)
      .single();

    if (error) throw new Error(`Could not add the Article: ${error.message}`);
    return toArticle(data as ArticleRow);
  }

  async updateArticle(
    articleId: ArticleId,
    draft: ArticleDraft,
  ): Promise<Article> {
    return this.patch(articleId, fromDraft(draft), "save");
  }

  async publishArticle(articleId: ArticleId): Promise<Article> {
    return this.patch(
      articleId,
      { published_at: new Date().toISOString() },
      "publish",
    );
  }

  async trashArticle(articleId: ArticleId): Promise<Article> {
    return this.patch(
      articleId,
      { deleted_at: new Date().toISOString() },
      "delete",
    );
  }

  async restoreArticle(articleId: ArticleId): Promise<Article> {
    return this.patch(articleId, { deleted_at: null }, "restore");
  }

  async deleteArticleForever(articleId: ArticleId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (error) {
      throw new Error(`Could not permanently delete the Article: ${error.message}`);
    }
  }

  async loadBondings(): Promise<Bonding[]> {
    const { data, error } = await this.resolveClient()
      .from("bondings")
      .select(BONDING_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Could not load the Bondings: ${error.message}`);
    return (data as BondingRow[]).map(toBonding);
  }

  async createBonding(draft: BondingDraft): Promise<Bonding> {
    const { data, error } = await this.resolveClient()
      .from("bondings")
      .insert({
        article_id: draft.articleId,
        atom_id: draft.atomId,
        name: draft.name,
      })
      .select(BONDING_COLUMNS)
      .single();

    if (error) throw new Error(`Could not bond the Article: ${error.message}`);
    return toBonding(data as BondingRow);
  }

  async updateBonding(bondingId: BondingId, name: string): Promise<Bonding> {
    const { data, error } = await this.resolveClient()
      .from("bondings")
      .update({ name })
      .eq("id", bondingId)
      .select(BONDING_COLUMNS)
      .single();

    if (error) throw new Error(`Could not reword the Bonding: ${error.message}`);
    return toBonding(data as BondingRow);
  }

  async deleteBonding(bondingId: BondingId): Promise<void> {
    const { error } = await this.resolveClient()
      .from("bondings")
      .delete()
      .eq("id", bondingId);

    if (error) throw new Error(`Could not unbond the Atom: ${error.message}`);
  }

  private async patch(
    articleId: ArticleId,
    values: Record<string, unknown>,
    verb: string,
  ): Promise<Article> {
    const { data, error } = await this.resolveClient()
      .from("articles")
      .update(values)
      .eq("id", articleId)
      .select(ARTICLE_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Could not ${verb} the Article: ${error.message}`);
    }
    return toArticle(data as ArticleRow);
  }
}

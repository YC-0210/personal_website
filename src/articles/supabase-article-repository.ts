import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { Article, ArticleDraft, ArticleId } from "./domain";
import type { ArticleRepository } from "./repository";

const ARTICLE_COLUMNS = "id, title, body, deleted_at";

interface ArticleRow {
  id: string;
  title: string;
  body: string;
  deleted_at: string | null;
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    deletedAt: row.deleted_at,
  };
}

function fromDraft(draft: ArticleDraft) {
  return { title: draft.title, body: draft.body };
}

/**
 * The real `ArticleRepository`, backed by Postgres through Supabase.
 *
 * The Trash is a `deleted_at` timestamp, and the RLS policies are what decide
 * who sees a trashed row: a Visitor's select is filtered to `deleted_at is
 * null` in the database, so the Trash is never on the wire for them at all.
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

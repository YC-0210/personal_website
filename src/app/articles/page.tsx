"use client";

import Link from "next/link";
import { useState } from "react";

import { ArticleEditor } from "@/components/article-editor";
import type { ArticleId } from "@/articles/domain";
import { getArticleStore, useArticles } from "@/articles/use-articles";

/**
 * The Articles page.
 *
 * Reading is the whole page; the Owner's controls only ever *add* to it, the
 * same arrangement the Sphere uses. Every surface, hairline, radius and step of
 * type here comes from DESIGN.md — there is no new look being invented, so
 * ADR-0004's prototype round does not apply.
 */
export default function ArticlesPage() {
  const { status, isEditMode, error, writeError } = useArticles();
  const store = getArticleStore();

  const [writing, setWriting] = useState<"none" | "new" | ArticleId>("none");
  /** The Article a delete is pending on — the two-step `AtomEditor` uses. */
  const [deletingId, setDeletingId] = useState<ArticleId | null>(null);

  const articles = store.articles();
  const trashCount = store.trash().length;

  async function handleDelete(articleId: ArticleId) {
    try {
      await store.deleteArticle(articleId);
      setDeletingId(null);
    } catch {
      // `writeError` carries the reason; the list stays as it was.
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
            WRITING
          </p>
          <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
            Articles
          </h1>
        </div>
        <Link
          href="/"
          className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          Sphere
        </Link>
      </div>

      {isEditMode && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWriting("new")}
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium"
          >
            Write Article
          </button>
          <Link
            href="/articles/trash"
            className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Trash{trashCount > 0 ? ` · ${trashCount}` : ""}
          </Link>
        </div>
      )}

      {writeError && (
        <p role="alert" className="text-ink-muted mt-4 text-xs">
          {writeError}
        </p>
      )}

      {(status === "idle" || status === "loading") && (
        <p className="text-ink-subtle mt-8 text-sm">Loading.</p>
      )}

      {status === "error" && (
        <p role="alert" className="text-ink-muted mt-8 text-sm">
          The Articles could not be loaded. {error}
        </p>
      )}

      {status === "ready" && articles.length === 0 && (
        <p className="text-ink-subtle mt-8 text-sm">Nothing written yet.</p>
      )}

      <ul className="mt-8 flex flex-col">
        {articles.map((article) => (
          <li key={article.id} className="border-hairline border-t py-4">
            <Link href={`/articles/${article.id}`} className="group block">
              <h2 className="text-ink group-hover:text-primary-hover text-lg font-medium tracking-[-0.01em]">
                {article.title}
              </h2>
              <p className="text-ink-subtle mt-1 line-clamp-2 text-sm leading-relaxed">
                {article.body}
              </p>
            </Link>

            {isEditMode && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {deletingId === article.id ? (
                  <>
                    <span className="text-ink-subtle">
                      Move “{article.title}” to the Trash?
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="text-ink font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(article.id)}
                      className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 font-medium"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setWriting(article.id)}
                      className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(article.id)}
                      className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {writing !== "none" && (
        <ArticleEditor
          article={writing === "new" ? undefined : store.getArticle(writing)}
          onClose={() => setWriting("none")}
        />
      )}
    </main>
  );
}

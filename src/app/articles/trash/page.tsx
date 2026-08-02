"use client";

import Link from "next/link";
import { useState } from "react";

import type { ArticleId } from "@/articles/domain";
import { getArticleStore, useArticles } from "@/articles/use-articles";

/**
 * The Trash: Articles the Owner has deleted but not destroyed.
 *
 * Restore is one click, because it undoes something. Permanently Delete is two,
 * and says so — it is the only action on the site with nothing after it.
 */
export default function ArticleTrashPage() {
  const { status, isEditMode, writeError } = useArticles();
  const store = getArticleStore();

  const [destroyingId, setDestroyingId] = useState<ArticleId | null>(null);
  const trashed = store.trash();

  async function run(action: Promise<void>) {
    try {
      await action;
      setDestroyingId(null);
    } catch {
      // `writeError` carries the reason; the list stays as it was.
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/articles"
        className="text-ink-subtle hover:text-ink text-sm font-medium"
      >
        ← Articles
      </Link>

      <h1 className="text-ink mt-6 text-[28px] font-semibold tracking-[-0.6px]">
        Trash
      </h1>
      <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
        Deleted Articles wait here. Nobody but you can see them.
      </p>

      {writeError && (
        <p role="alert" className="text-ink-muted mt-4 text-xs">
          {writeError}
        </p>
      )}

      {status === "ready" && !isEditMode && (
        <p className="text-ink-subtle mt-8 text-sm">
          Sign in on the Sphere to see the Trash.
        </p>
      )}

      {status === "ready" && isEditMode && trashed.length === 0 && (
        <p className="text-ink-subtle mt-8 text-sm">The Trash is empty.</p>
      )}

      <ul className="mt-8 flex flex-col">
        {trashed.map((article) => (
          <li key={article.id} className="border-hairline border-t py-4">
            <h2 className="text-ink-subtle text-lg font-medium tracking-[-0.01em]">
              {article.title}
            </h2>
            <p className="text-ink-tertiary mt-1 line-clamp-2 text-sm leading-relaxed">
              {article.body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {destroyingId === article.id ? (
                <>
                  <span className="text-ink-subtle">
                    Delete “{article.title}” for good? This cannot be undone.
                  </span>
                  <button
                    type="button"
                    onClick={() => setDestroyingId(null)}
                    className="text-ink font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void run(store.destroyArticle(article.id))}
                    className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 font-medium"
                  >
                    Delete for good
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void run(store.restoreArticle(article.id))}
                    className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-2.5 py-1 font-medium"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestroyingId(article.id)}
                    className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                  >
                    Permanently delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { getArticleStore, useArticles } from "@/articles/use-articles";

/**
 * One Article, read in full.
 *
 * A trashed Article is not readable here either — `getArticle` only answers for
 * Articles that are not in the Trash, and for a Visitor the row never left the
 * database in the first place.
 */
export default function ArticlePage() {
  const { status, error } = useArticles();
  const params = useParams<{ id: string }>();
  const article = getArticleStore().getArticle(params.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/articles"
        className="text-ink-subtle hover:text-ink text-sm font-medium"
      >
        ← Articles
      </Link>

      {status === "loading" && (
        <p className="text-ink-subtle mt-8 text-sm">Loading.</p>
      )}

      {status === "error" && (
        <p role="alert" className="text-ink-muted mt-8 text-sm">
          The Article could not be loaded. {error}
        </p>
      )}

      {status === "ready" && !article && (
        <p className="text-ink-subtle mt-8 text-sm">
          There is no Article here.
        </p>
      )}

      {article && (
        <article className="mt-6">
          <h1 className="text-ink text-[28px] leading-[1.15] font-semibold tracking-[-0.6px] text-balance">
            {article.title}
          </h1>
          {/* Plain text, deliberately: the body is what the Owner typed. */}
          <div className="text-ink-muted mt-6 text-base leading-[1.7] whitespace-pre-wrap">
            {article.body}
          </div>
        </article>
      )}
    </main>
  );
}

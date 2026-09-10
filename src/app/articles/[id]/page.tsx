"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { publishedOn } from "@/articles/published-date";
import { getArticleStore, useArticles } from "@/articles/use-articles";
import { ArticleBodyView } from "@/components/article-body-view";
import { DraftBadge } from "@/components/draft-badge";
import { atomLink } from "@/sphere/atom-link";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * One Article, read in full.
 *
 * A trashed Article is not readable here either — `getArticle` only answers for
 * Articles that are not in the Trash, and for a Visitor the row never left the
 * database in the first place.
 */
export default function ArticlePage() {
  const { status, error } = useArticles();
  // The Sphere is loaded here for the Atom labels alone — a Bonding carries an
  // Atom id, and only the Sphere knows what that Atom is called (ADR-0007).
  useSphere();
  const params = useParams<{ id: string }>();
  const store = getArticleStore();
  const article = store.getArticle(params.id);
  const sphere = getSphereStore();

  const bondedAtoms = store
    .bondingsForArticle(params.id)
    .map((bonding) => ({ bonding, atom: sphere.getAtom(bonding.atomId) }))
    // An Atom deleted out of the Sphere cascades its Bondings away in the
    // database; until the next load it can still be named here, so skip it
    // rather than render a link to nothing.
    .filter((row) => row.atom !== undefined);

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

          {/*
            When this was last published (#31). A draft renders nothing here —
            not a dash, not its creation date — because it has no publish to
            date, and the Draft badge below is already the whole statement.

            The formatted day is not parseable, so the ISO stamp rides along in
            `dateTime` where a machine can still read it.
          */}
          {article.publishedAt !== null && (
            <p className="text-ink-tertiary mt-3 text-xs">
              <time dateTime={article.publishedAt}>
                {publishedOn(article.publishedAt)}
              </time>
            </p>
          )}

          {/* Only the Owner can be here to see this: a draft is refused to a
              Visitor by RLS long before the page renders. */}
          {article.publishedAt === null && (
            <p className="mt-3 flex flex-wrap items-center gap-3">
              <DraftBadge />
              <Link
                href={`/articles/${article.id}/edit`}
                className="text-ink-subtle hover:text-primary-hover text-sm font-medium"
              >
                Keep writing →
              </Link>
            </p>
          )}
          {/* Rendered from the stored document — no HTML string in between. */}
          <ArticleBodyView body={article.body} className="mt-6" />

          {bondedAtoms.length > 0 && (
            <section className="mt-12">
              <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                BONDED ATOMS · {bondedAtoms.length}
              </p>
              <ul className="mt-2 flex flex-col">
                {bondedAtoms.map(({ bonding, atom }) => (
                  <li key={bonding.id} className="border-hairline border-t">
                    {/* Following one selects that Atom back in the Sphere. */}
                    <Link
                      href={atomLink(bonding.atomId)}
                      className="group flex flex-col gap-1 py-3"
                    >
                      <span className="text-ink-muted text-sm leading-relaxed">
                        {bonding.name}
                      </span>
                      <span className="text-ink-subtle group-hover:text-primary-hover text-xs">
                        → {atom?.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </main>
  );
}

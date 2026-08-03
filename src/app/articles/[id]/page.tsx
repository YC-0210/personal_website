"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { getArticleStore, useArticles } from "@/articles/use-articles";
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
          {/* Plain text, deliberately: the body is what the Owner typed. */}
          <div className="text-ink-muted mt-6 text-base leading-[1.7] whitespace-pre-wrap">
            {article.body}
          </div>

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

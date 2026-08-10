"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getArticleStore, useArticles } from "@/articles/use-articles";
import type { ArticleId, BondingId } from "@/articles/domain";
import { DraftBadge } from "@/components/draft-badge";

/**
 * The Articles bonded to one Atom, read from the Atom's end — and, for the
 * Owner, managed from there (decision 12 on #28).
 *
 * A Visitor sees the rows and nothing else. What they see is also *fewer* rows:
 * a draft's Bonding is refused to them by RLS and by the store's read rule, so
 * this count differs by who is looking. That is already true of the Trash, and
 * it is worth saying plainly — "WRITTEN ABOUT · N" is no longer an objective
 * fact about an Atom.
 *
 * Unbond and Delete are deliberately not adjacent lookalikes. Unbond removes a
 * link; Delete sends a piece of writing to the Trash. The whole risk decision 12
 * flags is a slip between the two, so they are separated, shaped differently,
 * and only Delete asks twice — naming the Article it means.
 */
export function AtomArticles({ atomId }: { atomId: string }) {
  const { isEditMode, writeError } = useArticles();
  const store = getArticleStore();
  const router = useRouter();

  const bonded = store.bondedArticles(atomId);

  const [starting, setStarting] = useState(false);
  const [newName, setNewName] = useState("");
  const [rewording, setRewording] = useState<BondingId | null>(null);
  const [rewordTo, setRewordTo] = useState("");
  const [deleting, setDeleting] = useState<ArticleId | null>(null);

  async function start() {
    try {
      const id = await store.startArticleBondedTo({ atomId, name: newName });
      setStarting(false);
      setNewName("");
      router.push(`/articles/${id}/edit`);
    } catch {
      // `writeError` carries the reason — most likely the missing Name.
    }
  }

  async function reword(bondingId: BondingId) {
    try {
      await store.editBonding(bondingId, rewordTo);
      setRewording(null);
    } catch {
      // Left open, with the reason shown, so the Owner can fix the Name.
    }
  }

  async function sendToTrash(articleId: ArticleId) {
    try {
      await store.deleteArticle(articleId);
      setDeleting(null);
    } catch {
      // The row stays as it was.
    }
  }

  if (bonded.length === 0 && !isEditMode) return null;

  return (
    <>
      <p className="text-ink-tertiary mt-8 text-[13px] font-medium tracking-[0.4px]">
        WRITTEN ABOUT · {bonded.length}
      </p>

      <div className="mt-2 flex flex-col">
        {bonded.map(({ article, bonding }) => (
          <div key={bonding.id} className="border-hairline border-t py-3">
            <Link
              href={`/articles/${article.id}`}
              className="hover:bg-primary-hover/5 group -mx-2 flex flex-col gap-1 rounded-md px-2 py-1"
            >
              <span className="text-ink-muted text-sm leading-relaxed">
                {bonding.name}
              </span>
              <span className="text-ink-subtle group-hover:text-primary-hover flex flex-wrap items-center gap-2 text-xs">
                → {article.title}
                {article.publishedAt === null && <DraftBadge />}
              </span>
            </Link>

            {isEditMode && rewording === bonding.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={rewordTo}
                  onChange={(event) => setRewordTo(event.target.value)}
                  aria-label="How this Atom feeds into this Article"
                  className="border-hairline bg-surface-2 text-ink min-w-0 flex-1 rounded-md border px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setRewording(null)}
                  className="text-ink-subtle hover:text-ink text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void reword(bonding.id)}
                  className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 text-xs font-medium"
                >
                  Save
                </button>
              </div>
            )}

            {isEditMode && deleting === article.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ink-subtle">
                  Move &ldquo;{article.title}&rdquo; to the Trash?
                </span>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendToTrash(article.id)}
                  className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 font-medium"
                >
                  Delete
                </button>
              </div>
            )}

            {isEditMode && rewording !== bonding.id && deleting !== article.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {/*
                  Two chips that act on the *bond*, then a gap, then a plain
                  destructive link that acts on the *Article*. Different shape,
                  different place — never two look-alike buttons side by side.
                */}
                <Link
                  href={`/articles/${article.id}/edit`}
                  className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setRewordTo(bonding.name);
                    setRewording(bonding.id);
                    setDeleting(null);
                  }}
                  className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                >
                  Reword
                </button>
                <button
                  type="button"
                  onClick={() => void store.deleteBonding(bonding.id)}
                  className="border-hairline bg-surface-1 text-ink-subtle hover:bg-surface-2 hover:text-ink rounded-md border px-2.5 py-1 font-medium"
                >
                  Unbond
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleting(article.id);
                    setRewording(null);
                  }}
                  className="text-ink-tertiary hover:text-ink ml-auto font-medium underline underline-offset-2"
                >
                  Delete to Trash
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isEditMode && (
        <div className="border-hairline border-t pt-3">
          {starting ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="new-bonding-name"
                className="text-ink-subtle text-xs leading-relaxed"
              >
                How does this Atom feed into the Article you are about to write?
              </label>
              <input
                id="new-bonding-name"
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="How classical physics connects to economics"
                className="border-hairline bg-surface-2 text-ink placeholder:text-ink-tertiary rounded-md border px-2 py-1.5 text-xs"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStarting(false);
                    setNewName("");
                  }}
                  className="text-ink-subtle hover:text-ink text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void start()}
                  className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-2.5 py-1 text-xs font-medium"
                >
                  Start writing
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStarting(true)}
              className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-2.5 py-1 text-xs font-medium"
            >
              Write a new Article
            </button>
          )}

          {writeError && (
            <p role="alert" className="text-ink-muted mt-2 text-xs">
              {writeError}
            </p>
          )}
        </div>
      )}
    </>
  );
}

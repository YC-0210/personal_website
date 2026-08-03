"use client";

import { useEffect, useRef, useState } from "react";

import type { Article } from "@/articles/domain";
import { getArticleStore, useArticles } from "@/articles/use-articles";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * Bonding an Article to the Atoms it draws on (issue #26).
 *
 * A Bonding is its own row rather than a field of the Article, so bonding and
 * unbonding save the moment they are used — they do not wait for the Article's
 * Save button, and they are deliberately not nested in its `<form>`.
 *
 * The Name is required, and the store is what refuses a blank one; the button
 * being disabled is a convenience on top of that rule, not the rule itself.
 */
function BondingSection({ article }: { article: Article }) {
  const store = getArticleStore();
  const { atoms } = useSphere();
  const sphere = getSphereStore();

  const [atomId, setAtomId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bondings = store.bondingsForArticle(article.id);
  const bondedIds = new Set(bondings.map((bonding) => bonding.atomId));
  const bondable = atoms.filter((atom) => !bondedIds.has(atom.id));

  async function bond() {
    setError(null);
    try {
      await store.addBonding({ articleId: article.id, atomId, name });
      setAtomId("");
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function unbond(bondingId: string) {
    setError(null);
    try {
      await store.deleteBonding(bondingId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="border-hairline mt-2 mb-4 border-t pt-4">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        BONDED ATOMS · {bondings.length}
      </p>
      <p className="text-ink-subtle mt-1 text-xs leading-relaxed">
        Say how each Atom feeds into this Article. The Atom&rsquo;s Dossier will
        list this Article back.
      </p>

      {bondings.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {bondings.map((bonding) => (
            <li
              key={bonding.id}
              className="border-hairline flex items-start justify-between gap-3 border-t py-2"
            >
              <span className="min-w-0">
                <span className="text-ink-muted block text-sm leading-relaxed">
                  {bonding.name}
                </span>
                <span className="text-ink-subtle text-xs">
                  → {sphere.getAtom(bonding.atomId)?.label ?? "Unknown Atom"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void unbond(bonding.id)}
                className="border-hairline bg-surface-2 text-ink-subtle hover:text-ink shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium"
              >
                Unbond
              </button>
            </li>
          ))}
        </ul>
      )}

      {bondable.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            aria-label="Atom to bond"
            value={atomId}
            onChange={(event) => setAtomId(event.target.value)}
            className="border-hairline bg-surface-2 text-ink rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Choose an Atom…</option>
            {bondable.map((atom) => (
              <option key={atom.id} value={atom.id}>
                {atom.label}
              </option>
            ))}
          </select>
          <input
            aria-label="How this Atom feeds into this Article"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            // Enter here would submit the Article form around it, which is not
            // what the Owner means while they are typing a Bonding Name.
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (atomId && name.trim()) void bond();
            }}
            placeholder="How this Atom feeds into this Article"
            className="border-hairline bg-surface-2 text-ink min-w-48 flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!atomId || name.trim() === ""}
            onClick={() => void bond()}
            className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Bond
          </button>
        </div>
      ) : (
        <p className="text-ink-tertiary mt-3 text-xs">
          {atoms.length === 0
            ? "There are no Atoms in the Sphere to bond to yet."
            : "Every Atom in the Sphere is already bonded to this Article."}
        </p>
      )}

      {error && (
        <p role="alert" className="text-ink-muted mt-3 text-xs">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * The Owner's Article form — the same dialog shell the Atom and Connection
 * editors use, so writing an Article looks like every other Owner write.
 *
 * There is no draft step: saving publishes (ADR-0006).
 */
export function ArticleEditor({
  article,
  onClose,
}: {
  /** The Article being rewritten, or undefined when writing a new one. */
  article?: Article;
  onClose: () => void;
}) {
  const { writeError } = useArticles();
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = {
      title: String(form.get("title") ?? "").trim(),
      body: String(form.get("body") ?? "").trim(),
    };

    const store = getArticleStore();
    setIsSaving(true);
    try {
      if (article) await store.editArticle(article.id, draft);
      else await store.addArticle(draft);
      onClose();
    } catch {
      // The store has already put the reason in `writeError`; the form stays
      // open over it so the Owner doesn't lose what they typed.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-form-heading"
        onSubmit={handleSubmit}
        className="border-hairline bg-surface-1 w-full max-w-2xl rounded-lg border p-6"
      >
        <h2
          id="article-form-heading"
          className="text-ink mb-4 text-lg font-semibold tracking-tight"
        >
          {article ? "Edit Article" : "Write Article"}
        </h2>

        <label
          className="text-ink-subtle mb-1 block text-xs"
          htmlFor="article-title"
        >
          Title
        </label>
        <input
          ref={titleRef}
          id="article-title"
          name="title"
          type="text"
          required
          defaultValue={article?.title ?? ""}
          className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
        />

        <label
          className="text-ink-subtle mb-1 block text-xs"
          htmlFor="article-body"
        >
          Body
        </label>
        <textarea
          id="article-body"
          name="body"
          rows={16}
          defaultValue={article?.body ?? ""}
          className="border-hairline bg-surface-2 text-ink mb-4 w-full resize-y rounded-md border px-3 py-2 text-sm leading-relaxed"
        />

        {/*
          Bonding needs an Article to bond, and a new one has no id until it is
          saved. Rather than hold the bonds in limbo, the section appears once
          the Article exists — which is one Save away.
        */}
        {article ? (
          <BondingSection article={article} />
        ) : (
          <p className="border-hairline text-ink-tertiary mt-2 mb-4 border-t pt-4 text-xs">
            Save the Article first, then reopen it to bond it to Atoms.
          </p>
        )}

        {writeError && (
          <p role="alert" className="text-ink-muted mb-3 text-xs">
            {writeError}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <span className="text-ink-tertiary mr-auto text-xs">
            Saving publishes it — there is no draft.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink rounded-md px-3 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

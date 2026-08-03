"use client";

import { useEffect, useRef, useState } from "react";

import type { Article } from "@/articles/domain";
import { getArticleStore, useArticles } from "@/articles/use-articles";

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
      className="fixed inset-0 grid place-items-center bg-black/60 p-4"
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

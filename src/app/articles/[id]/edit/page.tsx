"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Article, ArticleBody } from "@/articles/domain";
import { getArticleStore, useArticles } from "@/articles/use-articles";
import { WritingSurface } from "@/components/writing-surface";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/** How long the Owner has to stop typing before a save goes out. */
const AUTOSAVE_AFTER_MS = 900;

/** Matches Tailwind's `lg`, which is where the rail stops fitting beside the column. */
const DESKTOP = "(min-width: 1024px)";

/**
 * Whether there is room to write. Asked in JavaScript rather than with a
 * `hidden lg:block`, because hiding the surface in CSS still *mounts* it:
 * Tiptap initialises, a contenteditable sits in the DOM, and the editor is open
 * behind a curtain. ADR-0009 says it does not open at all.
 *
 * The server snapshot is `false`, so the editor is never server-rendered and a
 * phone that never hydrates still gets the explanation rather than a blank.
 */
function useHasRoomToWrite(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

type SaveState =
  | { kind: "clean" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "failed"; why: string };

/**
 * Writing an Article. Always `/articles/<id>/edit` — the draft is created
 * before the typing starts, so there is no separate "new Article" route
 * (decision 10 on #28).
 *
 * Autosave writes to the draft continuously and never publishes: that is the
 * whole of ADR-0008. Publishing is the one deliberate act, and it lands on the
 * Article, as does leaving — one destination from either entry point
 * (decision 11).
 */
export default function EditArticlePage() {
  const { status, isEditMode, error } = useArticles();
  // The Sphere is loaded for the Atom labels alone: a Bonding carries an Atom
  // id, and only the Sphere knows what that Atom is called (ADR-0007).
  useSphere();
  const params = useParams<{ id: string }>();
  const store = getArticleStore();

  const article = store.getArticle(params.id);

  if (status === "idle" || status === "loading") {
    return <Shell>Loading.</Shell>;
  }

  if (status === "error") {
    return <Shell role="alert">The Article could not be loaded. {error}</Shell>;
  }

  // Not the Owner: there is nothing to explain about editing, because a Visitor
  // cannot even read a draft. RLS has already refused it — this is the page
  // saying so rather than rendering an empty editor.
  if (!isEditMode) {
    return (
      <Shell>
        Writing is the Owner&rsquo;s. <Back id={params.id} />
      </Shell>
    );
  }

  if (!article) {
    return (
      <Shell>
        There is no Article here to write. <Back id={params.id} />
      </Shell>
    );
  }

  /*
   * Keyed on the id so that opening a different Article remounts the workspace
   * rather than trying to reconcile one document into another's editor. It also
   * means the title and body can be plain initial state below — the workspace
   * never exists before the Article it is editing does.
   */
  return <Workspace key={article.id} article={article} />;
}

function Workspace({ article }: { article: Article }) {
  const router = useRouter();
  const store = getArticleStore();
  const sphere = getSphereStore();

  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState<ArticleBody>(article.body);
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRoomToWrite = useHasRoomToWrite();

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function queueSave(next: { title: string; body: ArticleBody }) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSave({ kind: "saving" });
      void store
        .editArticle(article.id, {
          // An untitled draft would fail the database's non-blank check, so the
          // placeholder the Owner sees is also what gets stored.
          title: next.title.trim() === "" ? "Untitled" : next.title,
          body: next.body,
        })
        .then(() =>
          setSave({
            kind: "saved",
            at: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
        )
        .catch((cause: unknown) =>
          setSave({
            kind: "failed",
            why: cause instanceof Error ? cause.message : String(cause),
          }),
        );
    }, AUTOSAVE_AFTER_MS);
  }

  function publish() {
    void store
      .publishArticle(article.id)
      .then(() => router.push(`/articles/${article.id}`))
      .catch((cause: unknown) =>
        setSave({
          kind: "failed",
          why: cause instanceof Error ? cause.message : String(cause),
        }),
      );
  }

  const bonded = store
    .bondingsForArticle(article.id)
    .map((bonding) => ({ bonding, atom: sphere.getAtom(bonding.atomId) }));

  const isDraft = article.publishedAt === null;

  return (
    <main className="bg-canvas min-h-dvh">
      {/*
        Decision 13: writing is desktop-only, and the route has to *say* so
        rather than fail. A phone can still read the Article and publish the
        draft — both are here, and only the surface itself is withheld.
      */}
      {!hasRoomToWrite && (
        <div className="mx-auto max-w-md px-6 py-16">
          <h1 className="text-ink text-[22px] leading-[1.25] font-medium tracking-[-0.4px]">
            Writing is desktop-only
          </h1>
          <p className="text-ink-subtle mt-3 text-sm leading-relaxed">
            The toolbar here works off text selection, which fights your
            phone&rsquo;s own Copy/Paste menu, and the keyboard takes half the
            screen. This is a deliberate exception to the mobile parity the rest
            of the site keeps — not an oversight.
          </p>
          <p className="text-ink-subtle mt-3 text-sm leading-relaxed">
            You can still read &ldquo;{article.title}&rdquo;, and publish it if
            it is ready.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/articles/${article.id}`}
              className="border-hairline text-ink hover:bg-surface-2 rounded-md border px-3.5 py-2 text-sm font-medium"
            >
              Read it
            </Link>
            {isDraft && (
              <button
                type="button"
                onClick={publish}
                className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-2 text-sm font-medium"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      )}

      {hasRoomToWrite && (
        <WritingSurface
          title={title}
          body={body}
          onTitleChange={(next) => {
            setTitle(next);
            queueSave({ title: next, body });
          }}
          onBodyChange={(next) => {
            setBody(next);
            queueSave({ title, body: next });
          }}
          back={<Back id={article.id} />}
          rail={
            <>
              <section>
                <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                  STATE
                </p>
                <p className="mt-2 flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isDraft ? "bg-primary-hover" : "bg-semantic-success"
                    }`}
                  />
                  <span className="text-ink text-sm font-medium">
                    {isDraft ? "Draft" : "Published"}
                  </span>
                </p>
                <p className="text-ink-subtle mt-2 text-xs leading-relaxed">
                  {save.kind === "saving"
                    ? "Saving…"
                    : save.kind === "saved"
                      ? `Last saved ${save.at}.`
                      : save.kind === "failed"
                        ? `Not saved — ${save.why}`
                        : "No changes since it was opened."}
                  {isDraft && " Only you can read this."}
                </p>
                {isDraft && (
                  <button
                    type="button"
                    onClick={publish}
                    className="bg-primary text-on-primary hover:bg-primary-hover mt-4 w-full rounded-md px-3.5 py-2 text-sm font-medium"
                  >
                    Publish
                  </button>
                )}
              </section>

              <section className="border-hairline border-t pt-5">
                <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                  BONDED ATOMS · {bonded.length}
                </p>
                {bonded.length === 0 ? (
                  <p className="text-ink-subtle mt-3 text-xs leading-relaxed">
                    Nothing bonded yet. An Atom&rsquo;s own controls are where a
                    bond is made.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {bonded.map(({ bonding, atom }) => (
                      <li key={bonding.id}>
                        <p className="text-ink-muted text-sm leading-snug">
                          {bonding.name}
                        </p>
                        <p className="text-ink-subtle mt-0.5 text-xs">
                          → {atom?.label ?? "an Atom that has gone"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          }
        />
      )}
    </main>
  );
}

/** Leaving lands on the Article, from either entry point — decision 11. */
function Back({ id }: { id: string }) {
  return (
    <Link
      href={`/articles/${id}`}
      className="text-ink-tertiary hover:text-ink text-[13px] font-medium"
    >
      ← The Article
    </Link>
  );
}

function Shell({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "alert";
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p role={role} className="text-ink-subtle text-sm">
        {children}
      </p>
    </main>
  );
}

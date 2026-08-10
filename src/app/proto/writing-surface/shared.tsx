"use client";

/**
 * The parts all three round-2 directions share, so that what differs between
 * them is *layout* and nothing else. THROWAWAY, like everything under `/proto`.
 *
 * The editor engine is the real one — Tiptap, per decision 1 on #28 — because
 * the round is asking the Owner to judge a typing surface, and a mock of a
 * typing surface answers a different question. Bold actually bolds; the toolbar
 * actually knows what the caret is inside of.
 *
 * What is faked, deliberately: nothing is persisted. The save state is a timer,
 * so "Saving… / Saved / Published" can be *seen* being said in three different
 * places without a `jsonb` column existing yet.
 */

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One extension set for all three. It is the shape of the stored document, so
 * it is also the answer to "what markup can a paste bring in" — decision 8.
 * Images are out of the first cut (decision 3) and so are absent here.
 */
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  Placeholder.configure({
    placeholder: ({ node }: { node: { type: { name: string } } }) =>
      node.type.name === "heading" ? "Heading" : "Write, or press / for a block",
  }),
];

/** Enough of an Article to show every mark the round has to carry. */
const SEED = `
<p>Economics borrowed its mechanics from physics, and then kept the metaphor long
after the physics had moved on.</p>
<h2>Where the borrowing starts</h2>
<p>The equilibrium in a market is <em>not</em> the equilibrium in a system of
forces, but the second was <strong>reached for</strong> to explain the first.</p>
<blockquote><p>A metaphor is a loan. Interest accrues.</p></blockquote>
<ul><li><p>Marginalism, and the calculus that came with it</p></li>
<li><p>Equilibrium as a resting state rather than a claim</p></li></ul>
<p>Try selecting this sentence, and try pressing <code>/</code> on the empty line
below.</p>
<p></p>
`;

export function useProtoEditor() {
  return useEditor({
    extensions: EXTENSIONS,
    content: SEED,
    // Next renders this on the server first; Tiptap must not.
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "proto-prose focus:outline-none", spellcheck: "false" },
    },
  });
}

/* ---------------------------------------------------------------- save state */

export type SaveState =
  | { kind: "clean" }
  | { kind: "saving" }
  | { kind: "saved"; at: string };

/**
 * Autosave, simulated. Every keystroke restarts a short debounce; when it lands
 * the state goes saving → saved. `isPublished` is a separate axis, exactly as
 * decision 5 makes it on the real Article: a draft that has been saved is still
 * a draft.
 */
export function useSaveState(editor: Editor | null) {
  const [state, setState] = useState<SaveState>({ kind: "clean" });
  const [isPublished, setIsPublished] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [
        setTimeout(() => setState({ kind: "saving" }), 400),
        setTimeout(
          () =>
            setState({
              kind: "saved",
              at: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }),
          1100,
        ),
      ];
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      timers.current.forEach(clearTimeout);
    };
  }, [editor]);

  return { state, isPublished, publish: () => setIsPublished(true) };
}

/** The words each direction says, so only their *placement* is under test. */
export function saveWords(state: SaveState, isPublished: boolean): string {
  if (state.kind === "saving") return "Saving…";
  if (state.kind === "saved")
    return isPublished ? `Published · saved ${state.at}` : `Draft · saved ${state.at}`;
  return isPublished ? "Published" : "Draft";
}

/* ------------------------------------------------------------------ controls */

export const MARKS = [
  { label: "B", title: "Bold", is: "bold", run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { label: "I", title: "Italic", is: "italic", run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { label: "H2", title: "Heading", is: "heading", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "❝", title: "Quote", is: "blockquote", run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "‹›", title: "Code", is: "code", run: (e: Editor) => e.chain().focus().toggleCode().run() },
  { label: "↗", title: "Link", is: "link", run: linkPrompt },
] as const;

function linkPrompt(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run();
    return;
  }
  const href = window.prompt("Link to");
  if (href) editor.chain().focus().setLink({ href }).run();
}

export const BLOCKS = [
  { label: "Heading", hint: "H2", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Subheading", hint: "H3", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Quote", hint: "❝", run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "Bulleted list", hint: "•", run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", hint: "1.", run: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: "Code block", hint: "‹›", run: (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", hint: "—", run: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
] as const;

export function MarkButton({
  editor,
  mark,
}: {
  editor: Editor;
  mark: (typeof MARKS)[number];
}) {
  const active = editor.isActive(mark.is);
  return (
    <button
      type="button"
      title={mark.title}
      aria-label={mark.title}
      aria-pressed={active}
      // Tiptap loses the selection to a focused button; the toolbar must not
      // take focus off the text it is about to act on.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => mark.run(editor)}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm font-medium ${
        active ? "bg-surface-3 text-primary-hover" : "text-ink-muted hover:bg-surface-3 hover:text-ink"
      }`}
    >
      {mark.label}
    </button>
  );
}

export function BlockMenu({
  editor,
  onDone,
  className = "",
}: {
  editor: Editor;
  onDone: () => void;
  className?: string;
}) {
  return (
    <div
      role="menu"
      aria-label="Insert a block"
      className={`border-hairline bg-surface-3 flex w-56 flex-col rounded-lg border p-1 ${className}`}
    >
      {BLOCKS.map((block) => (
        <button
          key={block.label}
          type="button"
          role="menuitem"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            block.run(editor);
            onDone();
          }}
          className="text-ink-muted hover:bg-surface-4 hover:text-ink flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm"
        >
          {block.label}
          <span className="text-ink-tertiary text-xs">{block.hint}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The `/` affordance for directions that put block insert on a keystroke.
 * Opens when `/` is typed into an empty paragraph, and closes on Escape, on a
 * pick, or as soon as the caret is somewhere else.
 */
export function useSlashMenu(editor: Editor | null) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => {
    if (!editor) return;
    // Take the `/` back out — it was a gesture, not a character.
    const { from } = editor.state.selection;
    const before = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (before === "/") editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    setAt(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") return setAt(null);
      if (event.key !== "/") return;
      const { from, empty } = editor.state.selection;
      if (!empty || !editor.isActive("paragraph")) return;
      // Only at the very start of an otherwise empty line.
      if (editor.state.selection.$from.parent.textContent !== "/") return;
      const caret = editor.view.coordsAtPos(from);
      const box = dom.getBoundingClientRect();
      setAt({ top: caret.bottom - box.top + 6, left: caret.left - box.left });
    };
    const onSelect = () => setAt((open) => (open && editor.isActive("paragraph") ? open : null));
    dom.addEventListener("keyup", onKeyUp);
    editor.on("selectionUpdate", onSelect);
    return () => {
      dom.removeEventListener("keyup", onKeyUp);
      editor.off("selectionUpdate", onSelect);
    };
  }, [editor]);

  return { at, close };
}

/* -------------------------------------------------------------------- chrome */

export function ProtoBack({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/proto/writing-surface"
      className={`text-ink-tertiary hover:text-ink text-[13px] font-medium ${className}`}
    >
      ← Round 2
    </Link>
  );
}

export function ProseStyles() {
  return (
    <style>{`
      .proto-prose { color: var(--color-ink-muted); font-size: 19px; line-height: 1.72; }
      .proto-prose > * + * { margin-top: 1.1em; }
      .proto-prose h2 { color: var(--color-ink); font-size: 28px; font-weight: 600;
        letter-spacing: -0.6px; line-height: 1.2; margin-top: 1.9em; }
      .proto-prose h3 { color: var(--color-ink); font-size: 22px; font-weight: 500;
        letter-spacing: -0.4px; line-height: 1.25; margin-top: 1.7em; }
      .proto-prose strong { color: var(--color-ink); font-weight: 600; }
      .proto-prose a { color: var(--color-primary-hover); text-decoration: underline;
        text-underline-offset: 3px; }
      .proto-prose blockquote { border-left: 2px solid var(--color-hairline-strong);
        padding-left: 20px; color: var(--color-ink-subtle); font-style: italic; }
      .proto-prose ul, .proto-prose ol { padding-left: 1.4em; }
      .proto-prose ul { list-style: disc; }
      .proto-prose ol { list-style: decimal; }
      .proto-prose li > p { margin: 0; }
      .proto-prose li + li { margin-top: 0.4em; }
      .proto-prose code { background: var(--color-surface-2); border-radius: 4px;
        padding: 1px 5px; font-size: 0.87em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .proto-prose pre { background: var(--color-surface-1);
        border: 1px solid var(--color-hairline); border-radius: 8px; padding: 14px 16px;
        overflow-x: auto; font-size: 14px; line-height: 1.55; }
      .proto-prose pre code { background: none; padding: 0; }
      .proto-prose hr { border: 0; border-top: 1px solid var(--color-hairline); margin: 2em 0; }
      /* Placeholder text on the empty line the + and / affordances live on. */
      .proto-prose p.is-empty:first-child::before,
      .proto-prose .is-empty::before {
        content: attr(data-placeholder); color: var(--color-ink-tertiary);
        float: left; height: 0; pointer-events: none;
      }
    `}</style>
  );
}

export { EditorContent };
export type { Editor };

"use client";

/**
 * The writing surface — direction B, "the desk", chosen by the Owner in round 2
 * of the ADR-0004 prototypes.
 *
 * Writing is work, and work gets a workspace. The half of the screen that
 * direction A spent on margins is spent here on a rail that keeps the Article's
 * state, its bonded Atoms and its Publish button permanently in view. Nothing
 * is summoned; everything is already there.
 *
 * - Title: a labelled field above a hairline rule, set small, so it reads as a
 *   property *of* the document rather than as its first line.
 * - Toolbar: parked at the top of the writing column and always visible. It
 *   never floats to the selection.
 * - Insert: on a keystroke — `/` on an empty line. No gutter affordance.
 * - Column: 720-ish, left-aligned under the toolbar; the rail takes the right.
 * - State: spelled out in sentences in the rail, not compressed to a chip.
 */

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ARTICLE_EXTENSIONS } from "@/articles/editor-extensions";
import type { ArticleBody } from "@/articles/domain";

/* ------------------------------------------------------------------ controls */

const MARKS = [
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

const BLOCKS = [
  { label: "Heading", hint: "H2", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Subheading", hint: "H3", run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Quote", hint: "❝", run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "Bulleted list", hint: "•", run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", hint: "1.", run: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: "Code block", hint: "‹›", run: (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", hint: "—", run: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
] as const;

function MarkButton({ editor, mark }: { editor: Editor; mark: (typeof MARKS)[number] }) {
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
        active
          ? "bg-surface-3 text-primary-hover"
          : "text-ink-muted hover:bg-surface-3 hover:text-ink"
      }`}
    >
      {mark.label}
    </button>
  );
}

/**
 * Block insert on a keystroke: `/` typed into an otherwise empty paragraph.
 * Closes on Escape, on a pick, or as soon as the caret is somewhere else.
 */
function useSlashMenu(editor: Editor | null) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => {
    if (!editor) return;
    // Take the `/` back out — it was a gesture, not a character.
    const { from } = editor.state.selection;
    const before = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (before === "/") {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    }
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
      if (editor.state.selection.$from.parent.textContent !== "/") return;
      const caret = editor.view.coordsAtPos(from);
      const box = dom.getBoundingClientRect();
      setAt({ top: caret.bottom - box.top + 6, left: caret.left - box.left });
    };
    const onSelect = () =>
      setAt((open) => (open && editor.isActive("paragraph") ? open : null));

    dom.addEventListener("keyup", onKeyUp);
    editor.on("selectionUpdate", onSelect);
    return () => {
      dom.removeEventListener("keyup", onKeyUp);
      editor.off("selectionUpdate", onSelect);
    };
  }, [editor]);

  return { at, close };
}

function BlockMenu({
  editor,
  onDone,
  at,
}: {
  editor: Editor;
  onDone: () => void;
  at: { top: number; left: number };
}) {
  return (
    <div
      role="menu"
      aria-label="Insert a block"
      style={at}
      className="border-hairline bg-surface-3 absolute z-20 flex w-56 flex-col rounded-lg border p-1"
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

/* ------------------------------------------------------------------- surface */

export interface WritingSurfaceProps {
  title: string;
  body: ArticleBody;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: ArticleBody) => void;
  /** Filled by the page: the rail's contents, which the surface does not own. */
  rail: React.ReactNode;
  /** Where "back" goes. Always the Article itself — decision 11, no exceptions. */
  back: React.ReactNode;
}

export function WritingSurface({
  title,
  body,
  onTitleChange,
  onBodyChange,
  rail,
  back,
}: WritingSurfaceProps) {
  // The body is only ever pushed *into* the editor once. After that the editor
  // is the source of truth for it; re-setting content on every keystroke would
  // fight the caret.
  const seeded = useRef(false);

  const editor = useEditor({
    extensions: ARTICLE_EXTENSIONS,
    content: body,
    // Next renders this on the server first; Tiptap must not.
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "article-prose focus:outline-none" },
    },
    onUpdate: ({ editor: current }) => {
      onBodyChange(current.getJSON() as ArticleBody);
    },
  });

  useEffect(() => {
    if (!editor || seeded.current) return;
    seeded.current = true;
    editor.commands.setContent(body);
  }, [editor, body]);

  const { at, close } = useSlashMenu(editor);

  if (!editor) return null;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        {/* Parked, sticky, and the same strip whatever the caret is doing. */}
        <div className="border-hairline bg-canvas/90 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex max-w-[820px] items-center gap-0.5 px-8 py-2">
            {back}
            <span className="bg-hairline mr-2 ml-3 h-5 w-px" />
            {MARKS.map((mark) => (
              <MarkButton key={mark.title} editor={editor} mark={mark} />
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[820px] px-8 pt-10 pb-40">
          <label
            htmlFor="article-title"
            className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]"
          >
            TITLE
          </label>
          <input
            id="article-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              editor.commands.focus("start");
            }}
            placeholder="Untitled"
            className="text-ink placeholder:text-ink-tertiary mt-1.5 w-full bg-transparent text-[26px] leading-[1.25] font-medium tracking-[-0.5px] focus:outline-none"
          />

          {/* The rule is the point: the title and the body are two things. */}
          <hr className="border-hairline mt-5 mb-8" />

          <div className="relative">
            <EditorContent editor={editor} />
            {at && <BlockMenu editor={editor} onDone={close} at={at} />}
          </div>
        </div>
      </div>

      <aside className="border-hairline bg-surface-1 flex shrink-0 flex-col gap-6 border-t p-6 lg:w-80 lg:border-t-0 lg:border-l">
        {rail}
      </aside>
    </div>
  );
}

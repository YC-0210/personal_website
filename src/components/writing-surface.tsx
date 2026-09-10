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
 * - Images: dropped, pasted, or picked from the toolbar. All three land in the
 *   same place, because all three are the same gesture — "this picture, here".
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

/** Picked from the slash menu, this opens the file picker rather than running. */
const IMAGE_BLOCK = { label: "Image", hint: "▣" } as const;

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
  onPickImage,
}: {
  editor: Editor;
  onDone: () => void;
  at: { top: number; left: number };
  onPickImage: () => void;
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

      {/* Not a block that can be `run`: it has to go and get a file first. */}
      <button
        type="button"
        role="menuitem"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onDone();
          onPickImage();
        }}
        className="text-ink-muted hover:bg-surface-4 hover:text-ink flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm"
      >
        {IMAGE_BLOCK.label}
        <span className="text-ink-tertiary text-xs">{IMAGE_BLOCK.hint}</span>
      </button>
    </div>
  );
}


/**
 * Putting a picture where the caret is, whichever way it was offered.
 *
 * Picking from the toolbar, dropping onto the column and pasting from the
 * clipboard are one gesture said three ways, so they share one path: upload,
 * then set an image node at the caret. The upload has to finish first — a node
 * pointing at a blob URL would be a picture that vanishes on reload.
 *
 * The caller holds the result in a ref: Tiptap captures `editorProps` when the
 * editor is created, so drop and paste have to reach the *current* insert
 * rather than the one that existed at that moment.
 */
function useImageInsertion(
  editor: Editor | null,
  uploadImage: (file: File) => Promise<{ url: string }>,
) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const insert = useCallback(
    async (files: File[]) => {
      if (!editor || files.length === 0) return;
      setNotice(null);

      for (const file of files) {
        setPending((count) => count + 1);
        try {
          const { url } = await uploadImage(file);
          // `alt` starts empty and the Owner fills it from the toolbar. Empty
          // is the honest default: it is correct for a decorative picture, and
          // it keeps a screen reader from reading the URL out instead.
          editor.chain().focus().setImage({ src: url, alt: "" }).run();
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setPending((count) => count - 1);
        }
      }
    },
    [editor, uploadImage],
  );

  return { insert, notice, setNotice, pending };
}

/** The image files out of a drop or a paste, ignoring everything else in it. */
function imageFilesIn(transfer: DataTransfer | null): File[] {
  return Array.from(transfer?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

/* ------------------------------------------------------------------- surface */

interface WritingSurfaceBase {
  body: ArticleBody;
  onBodyChange: (body: ArticleBody) => void;
  /** Filled by the page: the rail's contents, which the surface does not own. */
  rail: React.ReactNode;
  /** Where "back" goes. One destination from either entry point — decision 11. */
  back: React.ReactNode;
  /**
   * Put a picture in the bucket and say where it ended up. Filled by the page,
   * because the document an Image belongs to is the page's business — the
   * surface only knows where the caret is.
   *
   * Required: every surface that opens for writing has somewhere to put a
   * picture — an Article into its bucket, a day into the Daylog's. It was
   * briefly optional, while the Daylog had nowhere to put one; keeping the
   * option now would be a branch no caller takes.
   */
  uploadImage: (file: File) => Promise<{ url: string }>;
}

/**
 * What stands above the rule: an Article's title, or whatever else names the
 * document.
 *
 * A Daylog Entry has no title — the date is its heading (#35, decision 11) — so
 * the slot is a node the caller fills rather than a field this owns. Expressed
 * as a union so a caller cannot pass both and leave it ambiguous which one the
 * document is actually named by.
 */
export type WritingSurfaceProps =
  | (WritingSurfaceBase & { title: string; onTitleChange: (title: string) => void })
  | (WritingSurfaceBase & { heading: React.ReactNode });

export function WritingSurface(props: WritingSurfaceProps) {
  const { body, onBodyChange, rail, back, uploadImage } = props;
  // The body is only ever pushed *into* the editor once. After that the editor
  // is the source of truth for it; re-setting content on every keystroke would
  // fight the caret.
  const seeded = useRef(false);

  // Declared before the editor so `editorProps`, which Tiptap captures once at
  // creation, can reach the insert that is current when a drop actually lands.
  const insertImages = useRef<((files: File[]) => void) | null>(null);

  const editor = useEditor({
    extensions: ARTICLE_EXTENSIONS,
    content: body,
    // Next renders this on the server first; Tiptap must not.
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "article-prose focus:outline-none" },
      handleDrop: (_view, event) => {
        const files = imageFilesIn((event as DragEvent).dataTransfer);
        if (files.length === 0) return false;
        // Handled here, so ProseMirror does not also try to make sense of it.
        event.preventDefault();
        insertImages.current?.(files);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = imageFilesIn(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImages.current?.(files);
        return true;
      },
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
  const insertion = useImageInsertion(editor, uploadImage);
  const picker = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    insertImages.current = (files) => void insertion.insert(files);
  }, [insertion]);

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

            <span className="bg-hairline mx-1 h-5 w-px" />

            <button
              type="button"
              title="Image"
              aria-label="Image"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => picker.current?.click()}
              className="text-ink-muted hover:bg-surface-3 hover:text-ink grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm font-medium"
            >
              ▣
            </button>

            {/*
              Alt text is a property of the picture the caret is on, so the
              control only exists while there is one. `window.prompt` is the
              same plain thing the Link control uses.
            */}
            {editor.isActive("image") && (
              <button
                type="button"
                title="Alt text"
                aria-label="Alt text"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const current = editor.getAttributes("image").alt ?? "";
                  const alt = window.prompt("Describe this picture", current);
                  if (alt !== null) {
                    editor.chain().focus().updateAttributes("image", { alt }).run();
                  }
                }}
                className="text-ink-muted hover:bg-surface-3 hover:text-ink grid h-8 place-items-center rounded-md px-2 text-[13px] font-medium"
              >
                ALT
              </button>
            )}

            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              hidden
              onChange={(event) => {
                void insertion.insert(Array.from(event.target.files ?? []));
                // Cleared so picking the same file twice fires again.
                event.target.value = "";
              }}
            />

            {insertion.pending > 0 && (
              <span className="text-ink-tertiary ml-2 text-xs">
                Uploading{insertion.pending > 1 ? ` ${insertion.pending}` : ""}…
              </span>
            )}
          </div>

          {insertion.notice && (
            <div className="mx-auto max-w-[820px] px-8 pb-2">
              <p role="alert" className="text-semantic-danger text-xs">
                {insertion.notice}{" "}
                <button
                  type="button"
                  onClick={() => insertion.setNotice(null)}
                  className="text-ink-tertiary hover:text-ink underline"
                >
                  Dismiss
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-[820px] px-8 pt-10 pb-40">
          {"heading" in props ? (
            props.heading
          ) : (
            <>
              <label
                htmlFor="article-title"
                className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]"
              >
                TITLE
              </label>
              <input
                id="article-title"
                value={props.title}
                onChange={(event) => props.onTitleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  editor.commands.focus("start");
                }}
                placeholder="Untitled"
                className="text-ink placeholder:text-ink-tertiary mt-1.5 w-full bg-transparent text-[26px] leading-[1.25] font-medium tracking-[-0.5px] focus:outline-none"
              />
            </>
          )}

          {/* The rule is the point: what names the document and the document
              itself are two things. */}
          <hr className="border-hairline mt-5 mb-8" />

          <div className="relative">
            <EditorContent editor={editor} />
            {at && (
              <BlockMenu
                editor={editor}
                onDone={close}
                at={at}
                onPickImage={() => picker.current?.click()}
              />
            )}
          </div>
        </div>
      </div>

      <aside className="border-hairline bg-surface-1 flex shrink-0 flex-col gap-6 border-t p-6 lg:w-80 lg:border-t-0 lg:border-l">
        {rail}
      </aside>
    </div>
  );
}

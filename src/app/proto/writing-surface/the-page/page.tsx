"use client";

/**
 * DIRECTION A — "The page takes over".
 *
 * The literal reading of Medium: the site goes away, and what is left is one
 * column of type on the canvas with nothing to look at but the words. The
 * answers it proposes to the six questions the round has to settle:
 *
 * - Title: the document's own first line, in the same column, separated from
 *   the body by size alone. No rule, no label, no field.
 * - Toolbar: floats on selection only. Nothing is parked, because a parked
 *   strip is a thing to look at, and this direction's whole claim is that there
 *   is nothing to look at.
 * - Insert: a `+` in the left margin, level with the empty line.
 * - Column: 680px, centred, everything else empty canvas.
 * - Sphere: gone outright.
 * - State: a thin top bar that fades to almost nothing until you reach for it.
 *
 * THROWAWAY — ADR-0004 round 2.
 */

import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { useState } from "react";

import {
  BlockMenu,
  EditorContent,
  MARKS,
  MarkButton,
  ProseStyles,
  ProtoBack,
  saveWords,
  useProtoEditor,
  useSaveState,
} from "../shared";

export default function ThePage() {
  const editor = useProtoEditor();
  const { state, isPublished, publish } = useSaveState(editor);
  const [title, setTitle] = useState("On borrowed metaphors");
  const [insertOpen, setInsertOpen] = useState(false);

  if (!editor) return null;

  return (
    <main className="bg-canvas min-h-dvh">
      <ProseStyles />

      {/*
        The bar is the only chrome. It sits at 55% opacity until the pointer is
        anywhere near it, which is the direction's thesis applied to itself.
      */}
      <header className="group fixed inset-x-0 top-0 z-10 opacity-55 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <div className="bg-canvas/85 flex items-center gap-4 px-6 py-3.5 backdrop-blur">
          <ProtoBack />
          <span className="text-ink-tertiary ml-auto text-[13px]">
            {saveWords(state, isPublished)}
          </span>
          <button
            type="button"
            onClick={publish}
            disabled={isPublished}
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            {isPublished ? "Published" : "Publish"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[680px] px-6 pt-32 pb-[45vh]">
        {/*
          The title is a textarea, not an input, so it wraps like the line of
          type it is pretending to be rather than scrolling sideways.
        */}
        <textarea
          aria-label="Title"
          value={title}
          rows={1}
          onChange={(event) => {
            setTitle(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            editor.commands.focus("start");
          }}
          placeholder="Title"
          className="text-ink placeholder:text-ink-tertiary w-full resize-none overflow-hidden bg-transparent text-[42px] leading-[1.12] font-semibold tracking-[-1.4px] focus:outline-none"
        />

        <div className="mt-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Selection is the only thing that summons a toolbar here. */}
      <BubbleMenu
        editor={editor}
        className="border-hairline bg-surface-3 flex items-center gap-0.5 rounded-lg border p-1"
      >
        {MARKS.map((mark) => (
          <MarkButton key={mark.title} editor={editor} mark={mark} />
        ))}
      </BubbleMenu>

      {/* The gutter +: only ever on an empty line, out in the left margin. */}
      <FloatingMenu
        editor={editor}
        options={{ placement: "left-start", offset: 12 }}
      >
        <div className="relative">
          <button
            type="button"
            aria-label="Insert a block"
            aria-expanded={insertOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setInsertOpen((open) => !open)}
            className="border-hairline text-ink-subtle hover:border-hairline-strong hover:text-ink grid h-7 w-7 place-items-center rounded-full border text-lg leading-none"
          >
            +
          </button>
          {insertOpen && (
            <BlockMenu
              editor={editor}
              onDone={() => setInsertOpen(false)}
              className="absolute top-9 left-0 z-20"
            />
          )}
        </div>
      </FloatingMenu>
    </main>
  );
}

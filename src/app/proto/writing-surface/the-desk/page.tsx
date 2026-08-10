"use client";

/**
 * DIRECTION B — "The desk".
 *
 * The opposite bet to A. Writing is work, and work gets a workspace: the empty
 * half of the screen is spent on a rail that keeps the Article's state, its
 * Bondings and its Publish button permanently in view, rather than on margins.
 * Nothing is summoned; everything is already there.
 *
 * - Title: hard-separated. A labelled field above a hairline rule, set small,
 *   so it reads as a property *of* the document rather than its first line.
 * - Toolbar: parked at the top of the writing column, always visible, never
 *   floating. You look up to it, the way you look up to a menu bar.
 * - Insert: on a keystroke — `/` on an empty line. No gutter affordance at all.
 * - Column: 720px, left-aligned under the toolbar, rail takes the right.
 * - Sphere: gone outright.
 * - State: a standing block in the rail, with the words spelled out — draft,
 *   last save, and what Publish will do — rather than compressed to a chip.
 *
 * THROWAWAY — ADR-0004 round 2.
 */

import { useState } from "react";

import {
  BlockMenu,
  EditorContent,
  MARKS,
  MarkButton,
  ProseStyles,
  ProtoBack,
  useProtoEditor,
  useSaveState,
  useSlashMenu,
} from "../shared";

/** Stand-ins, so the rail is judged at the weight it would really carry. */
const BONDED = [
  { atom: "Classical physics", name: "How classical physics connects to economics" },
  { atom: "Economics", name: "The borrowing, seen from the borrower's side" },
];

export default function TheDesk() {
  const editor = useProtoEditor();
  const { state, isPublished, publish } = useSaveState(editor);
  const { at, close } = useSlashMenu(editor);
  const [title, setTitle] = useState("On borrowed metaphors");

  if (!editor) return null;

  return (
    <main className="bg-canvas flex min-h-dvh flex-col lg:flex-row">
      <ProseStyles />

      <div className="min-w-0 flex-1">
        {/* Parked, sticky, and the same strip whatever the caret is doing. */}
        <div className="border-hairline bg-canvas/90 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex max-w-[820px] items-center gap-0.5 px-8 py-2">
            <ProtoBack className="mr-3" />
            <span className="bg-hairline mr-2 h-5 w-px" />
            {MARKS.map((mark) => (
              <MarkButton key={mark.title} editor={editor} mark={mark} />
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[820px] px-8 pt-10 pb-40">
          <label
            htmlFor="desk-title"
            className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]"
          >
            TITLE
          </label>
          <input
            id="desk-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              editor.commands.focus("start");
            }}
            placeholder="Untitled"
            className="text-ink placeholder:text-ink-tertiary mt-1.5 w-full bg-transparent text-[26px] leading-[1.25] font-medium tracking-[-0.5px] focus:outline-none"
          />

          {/* The rule is the point: title and body are two different things. */}
          <hr className="border-hairline mt-5 mb-8" />

          <div className="relative">
            <EditorContent editor={editor} />
            {at && (
              <BlockMenu
                editor={editor}
                onDone={close}
                className="absolute z-20"
                // Anchored to the caret, because that is where the `/` was typed.
                {...{ style: { top: at.top, left: at.left } }}
              />
            )}
          </div>
        </div>
      </div>

      <aside className="border-hairline bg-surface-1 flex shrink-0 flex-col gap-6 border-t p-6 lg:w-80 lg:border-t-0 lg:border-l">
        <section>
          <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
            STATE
          </p>
          <p className="mt-2 flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: isPublished ? "#27a644" : "#828fff" }}
            />
            <span className="text-ink text-sm font-medium">
              {isPublished ? "Published" : "Draft"}
            </span>
          </p>
          <p className="text-ink-subtle mt-2 text-xs leading-relaxed">
            {state.kind === "saving"
              ? "Saving…"
              : state.kind === "saved"
                ? `Last saved ${state.at}.`
                : "No changes since it was opened."}
            {!isPublished && " Only you can read this."}
          </p>
          <button
            type="button"
            onClick={publish}
            disabled={isPublished}
            className="bg-primary text-on-primary hover:bg-primary-hover mt-4 w-full rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-40"
          >
            {isPublished ? "Published" : "Publish"}
          </button>
        </section>

        <section className="border-hairline border-t pt-5">
          <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
            BONDED ATOMS · {BONDED.length}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {BONDED.map((bonding) => (
              <li key={bonding.atom}>
                <p className="text-ink-muted text-sm leading-snug">{bonding.name}</p>
                <p className="text-ink-subtle mt-0.5 text-xs">→ {bonding.atom}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-ink-tertiary mt-auto text-xs leading-relaxed">
          The rail is the direction&rsquo;s claim: this is a desk, not a page, so
          the things you need while writing stay out where you can see them.
        </p>
      </aside>
    </main>
  );
}

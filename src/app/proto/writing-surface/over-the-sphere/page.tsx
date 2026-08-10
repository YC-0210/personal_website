"use client";

/**
 * DIRECTION C — "Over the Sphere".
 *
 * The third bet: writing is not a separate application, so the site does not
 * disappear to make room for it. The Sphere keeps turning behind a sheet of
 * paper laid over it — dimmed and pushed out of focus, but visibly still there,
 * so an Article never stops being a thing attached to the knowledge it came
 * from. It is also the only direction where the emptiness around the column is
 * *something* rather than black.
 *
 * - Title: in a band at the top of the sheet that stays put while the body
 *   scrolls under it. Separated by never moving, rather than by a rule.
 * - Toolbar: both. Parked in the band when nothing is selected, and the same
 *   controls re-form at the selection when there is one.
 * - Insert: inline — the `+` sits at the end of the empty line itself, in the
 *   run of text, not out in a margin.
 * - Column: 640px inside a sheet with visible edges.
 * - Sphere: stays, all but undimmed, behind a sheet that is only 60% opaque
 *   and blurs what is under it. Takes no clicks.
 * - State: in the band beside the title, so the sentence you read is
 *   "«On borrowed metaphors» — Draft, saved 12:04".
 *
 * THROWAWAY — ADR-0004 round 2.
 */

import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { useEffect, useState } from "react";

import { SphereScene } from "@/components/sphere-scene";

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

export default function OverTheSphere() {
  const editor = useProtoEditor();
  const { state, isPublished, publish } = useSaveState(editor);
  const [title, setTitle] = useState("On borrowed metaphors");
  const [insertOpen, setInsertOpen] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Which of the two toolbars is speaking depends on whether anything is
  // selected, so this direction has to watch the selection itself.
  useEffect(() => {
    if (!editor) return;
    const onSelect = () => setHasSelection(!editor.state.selection.empty);
    editor.on("selectionUpdate", onSelect);
    return () => {
      editor.off("selectionUpdate", onSelect);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <main className="bg-canvas relative min-h-dvh">
      <ProseStyles />

      {/*
        The live Sphere, held back rather than removed. `pointer-events-none` is
        load-bearing: it is scenery here, and every click belongs to the sheet.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-90"
      >
        <SphereScene />
      </div>

      <div className="relative mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
        <ProtoBack className="mb-4 inline-block" />

        <div className="border-hairline bg-surface-1/60 rounded-xl border backdrop-blur-lg">
          {/* The band. Sticky, so the title and the state never scroll away. */}
          <div className="border-hairline bg-surface-1/70 sticky top-0 z-10 rounded-t-xl border-b px-7 py-4 backdrop-blur-lg">
            <div className="flex items-start gap-4">
              <input
                aria-label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  editor.commands.focus("start");
                }}
                placeholder="Untitled"
                className="text-ink placeholder:text-ink-tertiary min-w-0 flex-1 bg-transparent text-[22px] leading-[1.25] font-medium tracking-[-0.4px] focus:outline-none"
              />
              <span className="text-ink-subtle shrink-0 pt-1.5 text-xs">
                {saveWords(state, isPublished)}
              </span>
              <button
                type="button"
                onClick={publish}
                disabled={isPublished}
                className="bg-primary text-on-primary hover:bg-primary-hover shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
              >
                {isPublished ? "Published" : "Publish"}
              </button>
            </div>

            {/*
              Parked — but only while it is the only toolbar. On a selection it
              hands over to the bubble, so the two are never both saying it.
            */}
            <div
              className={`mt-3 flex items-center gap-0.5 transition-opacity ${
                hasSelection ? "pointer-events-none opacity-25" : "opacity-100"
              }`}
            >
              {MARKS.map((mark) => (
                <MarkButton key={mark.title} editor={editor} mark={mark} />
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[640px] px-7 pt-8 pb-32">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/*
        z-20, above the band's z-10. Tiptap flips the bubble below the selection
        when there is no room above, so it has not been caught under the band in
        practice — but the two do compete for the same strip of screen, and this
        page has a sticky element over a scrolling one. Cheap insurance against
        the failure this repo keeps shipping.
      */}
      <BubbleMenu
        editor={editor}
        className="border-hairline bg-surface-3 relative z-20 flex items-center gap-0.5 rounded-lg border p-1 shadow-lg shadow-black/40"
      >
        {MARKS.map((mark) => (
          <MarkButton key={mark.title} editor={editor} mark={mark} />
        ))}
      </BubbleMenu>

      {/* Inline: at the end of the empty line, in the run of the text. */}
      <FloatingMenu editor={editor} options={{ placement: "right-start", offset: 8 }}>
        <div className="relative">
          <button
            type="button"
            aria-label="Insert a block"
            aria-expanded={insertOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setInsertOpen((open) => !open)}
            className="border-hairline bg-surface-2 text-ink-subtle hover:border-hairline-strong hover:text-ink grid h-6 w-6 place-items-center rounded-md border text-sm leading-none"
          >
            +
          </button>
          {insertOpen && (
            <BlockMenu
              editor={editor}
              onDone={() => setInsertOpen(false)}
              className="absolute top-8 left-0 z-20"
            />
          )}
        </div>
      </FloatingMenu>
    </main>
  );
}

"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import {
  CODE_LANGUAGES,
  PLAIN_TEXT_LABEL,
  toCodeLanguage,
} from "@/articles/code-languages";

/**
 * A code block in the editor, with the language it is written in on it (#32).
 *
 * The picker is a node view rather than a toolbar button because a language
 * belongs to the *block*. The toolbar acts on wherever the caret happens to be;
 * a block's language is a property of that block whether the caret is in it or
 * not, and every block in an Article can be a different one.
 *
 * A native `select`, deliberately. It is a list of eight fixed options, which
 * is exactly what the element is for — it comes with keyboard support, type-
 * ahead and the platform's own touch picker, and none of that has to be built
 * or maintained here.
 */
export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  // Read through the same normaliser the reader uses, so a value the picker
  // could never produce cannot survive a round-trip through the editor either.
  const language = toCodeLanguage(node.attrs.language);

  return (
    <NodeViewWrapper className="relative">
      <select
        // `contentEditable={false}` keeps ProseMirror from treating the control
        // as part of the document — without it the select is text the Owner can
        // put a caret into, and arrow keys move the caret instead of the choice.
        contentEditable={false}
        value={language ?? ""}
        onChange={(event) =>
          updateAttributes({ language: toCodeLanguage(event.target.value) })
        }
        aria-label="Language of this code block"
        className="border-hairline bg-surface-2 text-ink-subtle hover:text-ink absolute top-2 right-2 z-10 rounded-md border px-1.5 py-0.5 text-xs"
      >
        <option value="">{PLAIN_TEXT_LABEL}</option>
        {CODE_LANGUAGES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      {/*
        The block's text. `as="code"` inside the wrapper's `pre` keeps the
        markup the reader produces and the markup the editor produces the same
        shape, so one set of styles covers both.
      */}
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

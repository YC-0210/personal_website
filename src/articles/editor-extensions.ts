import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { editorLowlight, PLAIN_TEXT_GRAMMAR } from "./code-highlight";
import { CodeBlockView } from "@/components/code-block-view";

/**
 * What an Article's body is allowed to contain.
 *
 * This is the source of truth for decision 8 on #28, not a convenience: the
 * stored document's shape is exactly what these extensions can produce, which
 * is what makes a paste from someone else's page harmless — the markup it
 * carries is not stripped afterwards, it is never representable in the first
 * place.
 *
 * Images are now in, and they arrived with the bucket, the upload path, the
 * RLS and the size limits that decision 3 said they would need — see
 * `supabase/migrations/20260903000000_article_images_bucket.sql` and ADR-0010.
 * `allowBase64` is off deliberately: a pasted `data:` image would embed a whole
 * picture in the row, and `data:` is exactly what `imageInNode` refuses to
 * draw on the way out.
 *
 * The code block is `CodeBlockLowlight` rather than StarterKit's own (#32), so
 * it can carry a language and be coloured for it. StarterKit's is switched off
 * rather than left alongside: two extensions claiming the `codeBlock` node is a
 * duplicate-name error, not a merge.
 *
 * `@/components/article-body-view` renders whatever this set can produce. The
 * two move together — adding an extension here without teaching the view about
 * it means the Owner can write something a reader silently never sees.
 */
export const ARTICLE_EXTENSIONS = [
  StarterKit.configure({
    // The Article's title is the h1, so the body starts one level down.
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true },
    // Replaced below. Both would claim the `codeBlock` node.
    codeBlock: false,
  }),
  CodeBlockLowlight.extend({
    // The picker lives on the block itself — see `CodeBlockView` for why. A
    // node view, not a config option: it replaces how the node is *drawn*.
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },
  }).configure({
    // The same registry the reader colours from, so the two cannot end up
    // knowing different languages — and one that cannot guess. Both halves
    // matter: without them the extension picks a language for any block that
    // does not name one it recognises, which is decision 3 on #32 inverted.
    lowlight: editorLowlight,
    defaultLanguage: PLAIN_TEXT_GRAMMAR,
  }),
  Image.configure({ allowBase64: false }),
  Placeholder.configure({
    placeholder: ({ node }: { node: { type: { name: string } } }) =>
      node.type.name === "heading" ? "Heading" : "Write, or press / for a block",
  }),
];

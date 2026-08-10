import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

/**
 * What an Article's body is allowed to contain.
 *
 * This is the source of truth for decision 8 on #28, not a convenience: the
 * stored document's shape is exactly what these extensions can produce, which
 * is what makes a paste from someone else's page harmless — the markup it
 * carries is not stripped afterwards, it is never representable in the first
 * place.
 *
 * Images are deliberately absent (decision 3): an image needs a Storage bucket,
 * an upload path, RLS and size limits, and that is its own ticket.
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
  }),
  Placeholder.configure({
    placeholder: ({ node }: { node: { type: { name: string } } }) =>
      node.type.name === "heading" ? "Heading" : "Write, or press / for a block",
  }),
];

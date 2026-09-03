import Image from "@tiptap/extension-image";
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
 * Images are now in, and they arrived with the bucket, the upload path, the
 * RLS and the size limits that decision 3 said they would need — see
 * `supabase/migrations/20260903000000_article_images_bucket.sql` and ADR-0010.
 * `allowBase64` is off deliberately: a pasted `data:` image would embed a whole
 * picture in the row, and `data:` is exactly what `imageInNode` refuses to
 * draw on the way out.
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
  Image.configure({ allowBase64: false }),
  Placeholder.configure({
    placeholder: ({ node }: { node: { type: { name: string } } }) =>
      node.type.name === "heading" ? "Heading" : "Write, or press / for a block",
  }),
];

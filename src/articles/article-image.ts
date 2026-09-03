/**
 * An Image in an Article: a picture the Owner uploads while writing, stored
 * beside the Article rather than hotlinked from someone else's server.
 *
 * The rules here are the near side of the Storage bucket's own — the bucket
 * declares the same size limit and the same MIME list, and that is what
 * actually holds. This exists so a refusal reads as a sentence in the rail
 * instead of arriving as a 413 after the Owner has waited for an upload.
 */

import type { ArticleBodyNode } from "./domain";

/** Five megabytes. Past this a picture is a download, not an illustration. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * What the editor can put on a page and a reader's browser can be relied on to
 * draw. SVG is deliberately absent: it is a document that can carry script, and
 * served from our own origin it would be a stored-XSS hole rather than a
 * picture.
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** As much of a file as deciding about it needs. A browser `File` is one. */
export interface ImageFile {
  name: string;
  type: string;
  size: number;
}

/**
 * Why this file cannot go into an Article, or null if it can.
 *
 * A sentence rather than a code, because the only thing that reads it is the
 * Owner.
 */
export function refusalFor(file: ImageFile): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return `“${file.name}” is not an image an Article can hold. It takes PNG, JPEG, WebP, GIF or AVIF.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is larger than the 5 MB an Article's Image may be.`;
  }

  return null;
}

/** The file extension each accepted type is stored under. */
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Where an Image sits in the bucket: under its Article, under a name nothing
 * else will ever take.
 *
 * The name is random rather than the file's own, for two reasons. Uploading
 * `diagram.png` twice must not have the second silently replace the first. And
 * the bucket is publicly readable, so a Draft's Images are reachable by anyone
 * holding the URL — a random name is what keeps them from being *found*, since
 * the Article's own id is not enough to guess by. See ADR-0010.
 *
 * The extension comes from the type, never from the name: a name is whatever
 * the uploader typed, and the two must not be able to disagree.
 */
export function imagePathFor(articleId: string, file: ImageFile): string {
  const extension = EXTENSIONS[file.type] ?? "bin";
  return `${articleId}/${crypto.randomUUID()}.${extension}`;
}

/**
 * What a reader should be shown for an `image` node, or null if it should be
 * shown nothing.
 *
 * The same bet `ArticleBodyView` makes everywhere else: a node it cannot make
 * sense of is dropped rather than guessed at. Only http(s) survives — the
 * editor cannot produce anything else, but a hand-edited row can, and `data:`
 * is how markup smuggles itself past a check that only looked at the node type.
 *
 * Missing alt text becomes empty alt text rather than none. That is the
 * correct answer for a picture that carries no information, and it is what
 * stops a screen reader reading a URL aloud in place of one.
 */
export function imageInNode(
  node: ArticleBodyNode,
): { src: string; alt: string } | null {
  const src = node.attrs?.src;
  if (typeof src !== "string" || !/^https?:\/\//i.test(src)) return null;

  const alt = node.attrs?.alt;
  return { src, alt: typeof alt === "string" ? alt : "" };
}

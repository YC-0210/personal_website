import type { ArticleId } from "./domain";

/** An Image once it is somewhere a reader's browser can fetch it. */
export interface ArticleImage {
  /** Where the picture lives. Absolute, and public — see ADR-0010. */
  url: string;
}

/**
 * Persistence seam for an Article's Images, sitting beside the Article
 * repository for the same reason it does: the store never talks to Supabase
 * Storage directly, so uploading is testable against an in-memory fake.
 *
 * Kept apart from `ArticleRepository` rather than folded into it because the
 * two answer to different stores of record — one is a table, the other a
 * bucket — and a picture outlives the row that referenced it either way.
 */
export interface ImageStore {
  /** Put a picture in the bucket and say where it ended up. */
  upload(articleId: ArticleId, file: File): Promise<ArticleImage>;
}

/**
 * Stands in when no bucket is wired up. Uploading fails loudly rather than
 * quietly doing nothing, the way `UnconfiguredAuthProvider` does.
 */
export class UnconfiguredImageStore implements ImageStore {
  async upload(): Promise<ArticleImage> {
    throw new Error("Image storage is not configured.");
  }
}

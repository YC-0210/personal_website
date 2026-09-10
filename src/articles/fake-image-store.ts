import type { ArticleId } from "./domain";
import { imagePathFor } from "./article-image";
import type { ArticleImage, ImageStore } from "./image-store";

/**
 * In-memory `ImageStore` for tests. Records what it was asked to keep, and can
 * be told to fail on demand — the same shape the other fakes take.
 */
export class FakeImageStore implements ImageStore {
  /** Every upload that reached the bucket, in the order they arrived. */
  readonly uploaded: { articleId: ArticleId; path: string; name: string }[] = [];
  private failure: Error | null = null;

  async upload(articleId: ArticleId, file: File): Promise<ArticleImage> {
    if (this.failure) throw this.failure;

    const path = imagePathFor(articleId, file);
    this.uploaded.push({ articleId, path, name: file.name });
    return { url: `https://bucket.test/article-images/${path}` };
  }

  failWith(error: Error | null): void {
    this.failure = error;
  }
}

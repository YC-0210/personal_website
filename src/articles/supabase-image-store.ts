import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import { imagePathFor } from "./article-image";
import type { ArticleId } from "./domain";
import type { ArticleImage, ImageStore } from "./image-store";

/** The bucket the `20260903000000_article_images_bucket` migration creates. */
const BUCKET = "article-images";

/**
 * The real `ImageStore`, backed by Supabase Storage.
 *
 * The bucket declares the size limit and the MIME list, so an upload the
 * client's own check somehow let through is still refused here. `upsert` is
 * off: paths are random, so a collision would mean something is wrong rather
 * than that the Owner meant to replace a picture.
 */
export class SupabaseImageStore implements ImageStore {
  private readonly resolveClient: () => SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.resolveClient = client ? () => client : getSupabaseClient;
  }

  async upload(articleId: ArticleId, file: File): Promise<ArticleImage> {
    const bucket = this.resolveClient().storage.from(BUCKET);
    const path = imagePathFor(articleId, file);

    const { error } = await bucket.upload(path, file, {
      contentType: file.type,
      // Pictures are immutable — the path is new every time — so they can be
      // cached for as long as a browser is willing to.
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(`Could not upload the Image: ${error.message}`);

    return { url: bucket.getPublicUrl(path).data.publicUrl };
  }
}

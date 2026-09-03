import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import { EMPTY_BODY } from "./article-body";
import { FakeArticleRepository } from "./fake-article-repository";
import { FakeImageStore } from "./fake-image-store";
import { createArticleStore } from "./article-store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

function png(name = "diagram.png", bytes = 40_000): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

async function ownerStore() {
  const repository = new FakeArticleRepository();
  const images = new FakeImageStore();
  const store = createArticleStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
    images,
  );
  await store.restoreSession();
  await store.load();
  return { repository, images, store };
}

describe("the Owner puts an Image in an Article", () => {
  it("keeps it beside that Article and hands back where to point at it", async () => {
    const { images, store } = await ownerStore();
    const id = await store.addArticle({ title: "On the Sphere", body: EMPTY_BODY });

    const image = await store.uploadImage(id, png());

    expect(images.uploaded).toHaveLength(1);
    expect(images.uploaded[0].articleId).toBe(id);
    expect(image.url).toContain(images.uploaded[0].path);
  });

  it("refuses a file that is not an image before it reaches the bucket", async () => {
    const { images, store } = await ownerStore();
    const id = await store.addArticle({ title: "On the Sphere", body: EMPTY_BODY });
    const notAnImage = new File(["%PDF"], "notes.pdf", {
      type: "application/pdf",
    });

    await expect(store.uploadImage(id, notAnImage)).rejects.toThrow(
      /PNG, JPEG, WebP, GIF or AVIF/,
    );

    // The point of refusing early: nothing was uploaded and then deleted.
    expect(images.uploaded).toHaveLength(0);
    expect(store.getState().writeError).toMatch(/PNG, JPEG, WebP, GIF or AVIF/);
  });
});

describe("a Visitor", () => {
  it("cannot put an Image anywhere, the same way they cannot write", async () => {
    const repository = new FakeArticleRepository();
    const images = new FakeImageStore();
    const store = createArticleStore(
      repository,
      new FakeAuthProvider({ owner: OWNER }),
      images,
    );
    await store.restoreSession();
    await store.load();

    await expect(store.uploadImage("article-1", png())).rejects.toThrow(
      /Edit Mode/,
    );
    expect(images.uploaded).toHaveLength(0);
  });
});

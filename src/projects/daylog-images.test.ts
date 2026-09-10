import { describe, expect, it } from "vitest";

import { FakeImageStore } from "@/articles/fake-image-store";
import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import { FakeProjectRepository } from "./fake-project-repository";
import { createProjectStore } from "./project-store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

function png(name = "screenshot.png", bytes = 40_000): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

async function ownerStore() {
  const repository = new FakeProjectRepository();
  const images = new FakeImageStore();
  const store = createProjectStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
    images,
  );
  await store.restoreSession();
  await store.load();
  return { repository, images, store };
}

/** A Project with one day in it, which is what a picture gets attached to. */
async function aDay(store: Awaited<ReturnType<typeof ownerStore>>["store"]) {
  const projectId = await store.addProject({
    name: "Knowledge Sphere",
    description: "The interactive sphere on the homepage.",
  });
  return store.addEntry(projectId, { date: "2026-09-10", body: { type: "doc", content: [] } });
}

describe("The Owner puts a picture in a day", () => {
  it("keeps it beside that Entry and hands back where to point at it", async () => {
    const { images, store } = await ownerStore();
    const entryId = await aDay(store);

    const image = await store.uploadImage(entryId, png());

    // Filed under the *Entry*, not the Project: a picture belongs to the day it
    // records, and a Project can hold years of them.
    expect(images.uploaded).toHaveLength(1);
    expect(images.uploaded[0].articleId).toBe(entryId);
    expect(image.url).toContain(images.uploaded[0].path);
  });

  it("refuses a file that is not an image before it reaches the bucket", async () => {
    const { images, store } = await ownerStore();
    const entryId = await aDay(store);
    const notAnImage = new File(["%PDF"], "notes.pdf", {
      type: "application/pdf",
    });

    await expect(store.uploadImage(entryId, notAnImage)).rejects.toThrow(
      /PNG, JPEG, WebP, GIF or AVIF/,
    );

    expect(images.uploaded).toHaveLength(0);
    expect(store.getState().writeError).toMatch(/PNG, JPEG, WebP, GIF or AVIF/);
  });
});

describe("A Visitor", () => {
  it("cannot put a picture in anyone's day", async () => {
    const images = new FakeImageStore();
    const store = createProjectStore(
      new FakeProjectRepository(),
      new FakeAuthProvider({ owner: OWNER }),
      images,
    );
    await store.restoreSession();
    await store.load();

    await expect(store.uploadImage("day-1", png())).rejects.toThrow(/Edit Mode/);
    expect(images.uploaded).toHaveLength(0);
  });
});

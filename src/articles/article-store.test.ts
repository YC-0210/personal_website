import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import type { Article } from "./domain";
import { FakeArticleRepository } from "./fake-article-repository";
import { createArticleStore } from "./article-store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

async function ownerStore(articles?: Article[]) {
  const repository = new FakeArticleRepository({ articles });
  const store = createArticleStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
  );
  await store.restoreSession();
  await store.load();
  return { repository, store };
}

describe("Owner writes an Article", () => {
  it("publishes it the moment it is saved — there is no draft step", async () => {
    const { repository, store } = await ownerStore();
    const loadsBefore = repository.loadCount;

    await store.addArticle({
      title: "On the Sphere",
      body: "Why the homepage is a Sphere and not a list.",
    });

    expect(store.articles()).toEqual([
      {
        id: expect.any(String),
        title: "On the Sphere",
        body: "Why the homepage is a Sphere and not a list.",
        deletedAt: null,
      },
    ]);
    expect(repository.loadCount).toBe(loadsBefore);
  });
});

const onTheSphere: Article = {
  id: "article-sphere",
  title: "On the Sphere",
  body: "Why the homepage is a Sphere and not a list.",
  deletedAt: null,
};

describe("Owner edits an Article", () => {
  it("rewrites it in place, live, with no publish step in between", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);
    const loadsBefore = repository.loadCount;

    await store.editArticle(onTheSphere.id, {
      title: "On the Sphere, revisited",
      body: "A list would have been easier. Here is why it lost.",
    });

    expect(store.articles()).toEqual([
      {
        id: onTheSphere.id,
        title: "On the Sphere, revisited",
        body: "A list would have been easier. Here is why it lost.",
        deletedAt: null,
      },
    ]);
    expect(repository.loadCount).toBe(loadsBefore);

    // Saved, not just shown: it survives a round-trip through the repository.
    await store.load();
    expect(store.articles()[0].title).toBe("On the Sphere, revisited");
  });
});

describe("Deleting an Article moves it to the Trash", () => {
  it("takes it off the public list without removing the row", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);

    await store.deleteArticle(onTheSphere.id);

    expect(store.articles()).toEqual([]);
    // Still there, and marked — a delete the Owner can walk back.
    const [stored] = await repository.loadArticles();
    expect(stored.id).toBe(onTheSphere.id);
    expect(stored.deletedAt).not.toBeNull();
  });

  it("lists it in the Trash, where the public list never shows it", async () => {
    const { store } = await ownerStore([onTheSphere]);

    await store.deleteArticle(onTheSphere.id);

    expect(store.trash().map((article) => article.id)).toEqual([
      onTheSphere.id,
    ]);
    expect(store.articles()).toEqual([]);
  });
});

describe("Getting an Article back, or getting rid of it for good", () => {
  const trashed: Article = {
    ...onTheSphere,
    deletedAt: "2026-07-01T09:00:00.000Z",
  };

  it("restores it from the Trash to the public list", async () => {
    const { store } = await ownerStore([trashed]);

    await store.restoreArticle(trashed.id);

    expect(store.articles().map((article) => article.id)).toEqual([trashed.id]);
    expect(store.trash()).toEqual([]);

    // Restored in the store of record, not just on screen.
    await store.load();
    expect(store.articles()[0].deletedAt).toBeNull();
  });

  it("permanently deletes it, leaving nothing behind", async () => {
    const { repository, store } = await ownerStore([trashed]);

    await store.destroyArticle(trashed.id);

    expect(store.trash()).toEqual([]);
    expect(store.articles()).toEqual([]);
    expect(await repository.loadArticles()).toEqual([]);
  });

  it("keeps the two apart — deleting does not destroy", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);

    await store.deleteArticle(onTheSphere.id);

    // The Trash is a holding place. Only `destroyArticle` empties it.
    expect(await repository.loadArticles()).toHaveLength(1);
  });
});

async function visitorStore(articles?: Article[]) {
  const repository = new FakeArticleRepository({ articles });
  const store = createArticleStore(
    repository,
    new FakeAuthProvider({ owner: OWNER }),
  );
  await store.load();
  return { repository, store };
}

describe("A Visitor reading the Articles page", () => {
  it("opens one from the list and reads it in full", async () => {
    const { store } = await visitorStore([onTheSphere]);

    expect(store.getArticle(onTheSphere.id)).toEqual(onTheSphere);
  });

  it("cannot open one that has been moved to the Trash", async () => {
    const { store } = await visitorStore([
      { ...onTheSphere, deletedAt: "2026-07-01T09:00:00.000Z" },
    ]);

    expect(store.getArticle(onTheSphere.id)).toBeUndefined();
  });
});

describe("Article writes outside Edit Mode", () => {
  it("refuses to write one at all", async () => {
    const { repository, store } = await visitorStore();

    await expect(
      store.addArticle({ title: "Sneaked in", body: "Not mine to write." }),
    ).rejects.toThrow("Edit Mode");

    expect(await repository.loadArticles()).toEqual([]);
  });

  it("refuses to edit, trash, restore or destroy one", async () => {
    const { repository, store } = await visitorStore([onTheSphere]);

    await expect(
      store.editArticle(onTheSphere.id, { title: "Tampered", body: "Nope." }),
    ).rejects.toThrow("Edit Mode");
    await expect(store.deleteArticle(onTheSphere.id)).rejects.toThrow(
      "Edit Mode",
    );
    await expect(store.restoreArticle(onTheSphere.id)).rejects.toThrow(
      "Edit Mode",
    );
    await expect(store.destroyArticle(onTheSphere.id)).rejects.toThrow(
      "Edit Mode",
    );

    expect(await repository.loadArticles()).toEqual([onTheSphere]);
  });
});

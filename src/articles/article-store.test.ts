import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import type { Article } from "./domain";
import { paragraphs } from "./article-body";
import { FakeArticleRepository } from "./fake-article-repository";
import { createArticleStore } from "./article-store";

const PUBLISHED = "2026-07-30T12:00:00.000Z";

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
  it("saves it as a draft — saving no longer publishes it (ADR-0006 amended)", async () => {
    const { repository, store } = await ownerStore();
    const loadsBefore = repository.loadCount;

    // The id comes back because the draft exists before the typing does: the
    // editor is always /articles/<id>/edit, so there is no "new" route.
    const id = await store.addArticle({
      title: "On the Sphere",
      body: paragraphs("Why the homepage is a Sphere and not a list."),
    });

    expect(store.getArticle(id)).toEqual({
      id,
      title: "On the Sphere",
      body: paragraphs("Why the homepage is a Sphere and not a list."),
      deletedAt: null,
      publishedAt: null,
    });
    expect(repository.loadCount).toBe(loadsBefore);
  });
});

describe("Publishing an Article", () => {
  it("is a separate act, and only then can a Visitor read it", async () => {
    const { repository, store } = await ownerStore();
    const id = await store.addArticle({
      title: "On the Sphere",
      body: paragraphs("Why the homepage is a Sphere and not a list."),
    });

    await store.publishArticle(id);

    expect(store.getArticle(id)?.publishedAt).toEqual(expect.any(String));

    // Saved, not merely shown: a Visitor loading fresh from the repository sees
    // it, which is the whole difference publishing makes.
    const visitor = await visitorStoreOver(repository);
    expect(visitor.articles().map((article) => article.id)).toEqual([id]);
  });

  it("leaves an Article the Owner has only saved unreadable to a Visitor", async () => {
    const { repository, store } = await ownerStore();
    await store.addArticle({
      title: "Half a thought",
      body: paragraphs("Not finished."),
    });

    const visitor = await visitorStoreOver(repository);
    expect(visitor.articles()).toEqual([]);
  });
});

const onTheSphere: Article = {
  id: "article-sphere",
  title: "On the Sphere",
  body: paragraphs("Why the homepage is a Sphere and not a list."),
  deletedAt: null,
  publishedAt: PUBLISHED,
};

describe("Owner edits an Article", () => {
  it("rewrites it in place without touching whether it is published", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);
    const loadsBefore = repository.loadCount;

    await store.editArticle(onTheSphere.id, {
      title: "On the Sphere, revisited",
      body: paragraphs("A list would have been easier. Here is why it lost."),
    });

    expect(store.articles()).toEqual([
      {
        id: onTheSphere.id,
        title: "On the Sphere, revisited",
        body: paragraphs("A list would have been easier. Here is why it lost."),
        deletedAt: null,
        // Unchanged: this is the call autosave makes, and autosave must not be
        // able to publish or unpublish anything (ADR-0008).
        publishedAt: PUBLISHED,
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

describe("Bonding an Article to an Atom", () => {
  it("reads the Bondings already on record when the page loads", async () => {
    const repository = new FakeArticleRepository({
      articles: [onTheSphere],
      bondings: [
        {
          id: "bonding-physics",
          articleId: onTheSphere.id,
          atomId: "atom-physics",
          name: "How classical physics connects to economics",
        },
      ],
    });
    const store = createArticleStore(
      repository,
      new FakeAuthProvider({ owner: OWNER, signedIn: true }),
    );

    await store.load();

    expect(store.bondingsForArticle(onTheSphere.id)).toHaveLength(1);
    expect(store.bondedArticles("atom-physics")).toHaveLength(1);
  });

  it("records how that particular Atom feeds into that particular Article", async () => {
    const { store } = await ownerStore([onTheSphere]);

    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });

    expect(store.bondingsForArticle(onTheSphere.id)).toEqual([
      {
        id: expect.any(String),
        articleId: onTheSphere.id,
        atomId: "atom-physics",
        name: "How classical physics connects to economics",
      },
    ]);
  });

  it("refuses one with no Name — an unexplained bond is not knowledge", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);

    await expect(
      store.addBonding({
        articleId: onTheSphere.id,
        atomId: "atom-physics",
        name: "   ",
      }),
    ).rejects.toThrow("Name");

    // Refused in the store, so it never reached the store of record either.
    expect(await repository.loadBondings()).toEqual([]);
    expect(store.bondingsForArticle(onTheSphere.id)).toEqual([]);
  });

  it("refuses to bond the same Article and Atom twice", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);
    const pair = { articleId: onTheSphere.id, atomId: "atom-physics" };

    await store.addBonding({ ...pair, name: "Physics feeds the argument" });
    await expect(
      store.addBonding({ ...pair, name: "Said again, differently" }),
    ).rejects.toThrow("already bonded");

    expect(await repository.loadBondings()).toHaveLength(1);
  });
});

const onEconomics: Article = {
  id: "article-economics",
  title: "On Economics",
  body: paragraphs("Why the mechanics metaphor got borrowed, and where it broke."),
  deletedAt: null,
  publishedAt: PUBLISHED,
};

describe("Reading a Bonding from the Atom's end", () => {
  it("lists every Article bonded to that Atom, each with its Bonding Name", async () => {
    const { store } = await ownerStore([onTheSphere, onEconomics]);

    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });
    // A different Atom entirely — it has no business in this Dossier.
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-graphics",
      name: "Why the Sphere is drawn and not listed",
    });

    expect(
      store.bondedArticles("atom-physics").map(({ article, bonding }) => [
        article.title,
        bonding.name,
      ]),
    ).toEqual([
      ["On the Sphere", "How classical physics connects to economics"],
      ["On Economics", "Where the mechanics metaphor breaks"],
    ]);
  });

  it("drops an Article that has gone to the Trash", async () => {
    const { store } = await ownerStore([onTheSphere, onEconomics]);
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });

    await store.deleteArticle(onTheSphere.id);

    // The Dossier must not link to something the reader cannot open.
    expect(
      store.bondedArticles("atom-physics").map(({ article }) => article.id),
    ).toEqual([onEconomics.id]);
  });
});

describe("Reading a Bonding from the Article's end", () => {
  it("lists every Atom the Article draws on, each with its own Name", async () => {
    const { store } = await ownerStore([onTheSphere, onEconomics]);

    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-graphics",
      name: "Why the Sphere is drawn and not listed",
    });
    // Another Article's bond, on an Atom this one also uses.
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });

    expect(
      store
        .bondingsForArticle(onTheSphere.id)
        .map((bonding) => [bonding.atomId, bonding.name]),
    ).toEqual([
      ["atom-physics", "How classical physics connects to economics"],
      ["atom-graphics", "Why the Sphere is drawn and not listed"],
    ]);
  });

  it("unbonds one without touching the Article or the other bonds", async () => {
    const { repository, store } = await ownerStore([onTheSphere]);
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-graphics",
      name: "Why the Sphere is drawn and not listed",
    });
    const [physics] = store.bondingsForArticle(onTheSphere.id);

    await store.deleteBonding(physics.id);

    expect(
      store.bondingsForArticle(onTheSphere.id).map((b) => b.atomId),
    ).toEqual(["atom-graphics"]);
    expect(await repository.loadBondings()).toHaveLength(1);
    expect(store.getArticle(onTheSphere.id)).toBeDefined();
  });
});

describe("An Article destroyed for good", () => {
  it("takes its Bondings with it, so no Atom links into nothing", async () => {
    const { repository, store } = await ownerStore([onTheSphere, onEconomics]);
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });

    await store.deleteArticle(onTheSphere.id);
    await store.destroyArticle(onTheSphere.id);

    expect(store.bondingsForArticle(onTheSphere.id)).toEqual([]);
    expect(store.bondedArticles("atom-physics")).toHaveLength(1);
    // Gone from the store of record too — the database cascades, and the store
    // mirrors it so the page never draws a bond to an Article that has gone.
    expect(await repository.loadBondings()).toHaveLength(1);
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

/**
 * A Visitor reading the same rows the Owner just wrote.
 *
 * The fake hands out everything it holds, exactly as it does for the Owner —
 * it is not a stand-in for RLS. That is the point: what keeps a draft off a
 * Visitor's list *here* is the store's own read rule, and this is the test that
 * holds it. The database's identical rule is enforced in the migration.
 */
async function visitorStoreOver(repository: FakeArticleRepository) {
  const store = createArticleStore(
    repository,
    new FakeAuthProvider({ owner: OWNER }),
  );
  await store.load();
  return store;
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

describe("Starting an Article from an Atom", () => {
  it("creates the draft and its Bonding in the one gesture", async () => {
    const { store } = await ownerStore();

    const id = await store.startArticleBondedTo({
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });

    expect(store.getArticle(id)?.publishedAt).toBeNull();
    expect(store.bondingsForArticle(id)).toEqual([
      {
        id: expect.any(String),
        articleId: id,
        atomId: "atom-physics",
        name: "How classical physics connects to economics",
      },
    ]);
  });

  it("refuses a nameless bond, and leaves no half-written Article behind", async () => {
    const { repository, store } = await ownerStore();

    await expect(
      store.startArticleBondedTo({ atomId: "atom-physics", name: "   " }),
    ).rejects.toThrow("A Bonding needs a Name");

    // The invariant from #26 is not routed around by the new entry point, and
    // failing it does not strand an untitled draft nobody asked for.
    expect(await repository.loadArticles()).toEqual([]);
    expect(await repository.loadBondings()).toEqual([]);
  });
});

describe("Rewording a Bonding", () => {
  it("changes what the bond says without touching either end of it", async () => {
    const { store } = await ownerStore([onTheSphere]);
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    const [bonding] = store.bondingsForArticle(onTheSphere.id);

    await store.editBonding(bonding.id, "Where the mechanics metaphor came from");

    expect(store.bondingsForArticle(onTheSphere.id)).toEqual([
      {
        id: bonding.id,
        articleId: onTheSphere.id,
        atomId: "atom-physics",
        name: "Where the mechanics metaphor came from",
      },
    ]);
  });

  it("refuses to reword it into nothing", async () => {
    const { store } = await ownerStore([onTheSphere]);
    await store.addBonding({
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    const [bonding] = store.bondingsForArticle(onTheSphere.id);

    await expect(store.editBonding(bonding.id, "  ")).rejects.toThrow(
      "A Bonding needs a Name",
    );

    expect(store.bondingsForArticle(onTheSphere.id)[0].name).toBe(
      "How classical physics connects to economics",
    );
  });
});

describe("A Visitor and a draft bonded to an Atom", () => {
  /**
   * The Bonding is created with the draft, not on publish (decision 6), so a
   * draft's Bonding genuinely exists while the Article is still private. Both
   * ways in have to refuse it — the Articles list is not the only read path.
   */
  async function draftBondedToPhysics() {
    const { repository, store } = await ownerStore();
    const id = await store.addArticle({
      title: "Half a thought",
      body: paragraphs("Not finished."),
    });
    await store.addBonding({
      articleId: id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    return { id, repository, owner: store };
  }

  it("cannot open it by id, the way the Trash is also refused by id", async () => {
    const { id, repository } = await draftBondedToPhysics();

    const visitor = await visitorStoreOver(repository);

    expect(visitor.getArticle(id)).toBeUndefined();
  });

  it("does not reach it through the Atom's Dossier either", async () => {
    const { repository } = await draftBondedToPhysics();

    const visitor = await visitorStoreOver(repository);

    // The Bonding row is right there in `bondings` — what keeps it off the
    // Dossier is that the Article behind it is not readable.
    expect(visitor.bondedArticles("atom-physics")).toEqual([]);
  });

  it("is still the Owner's to see and finish, in both places", async () => {
    const { id, owner } = await draftBondedToPhysics();

    expect(owner.getArticle(id)?.publishedAt).toBeNull();
    expect(
      owner.bondedArticles("atom-physics").map((row) => row.article.id),
    ).toEqual([id]);
  });
});

describe("Article writes outside Edit Mode", () => {
  it("refuses to write one at all", async () => {
    const { repository, store } = await visitorStore();

    await expect(
      store.addArticle({ title: "Sneaked in", body: paragraphs("Not mine to write.") }),
    ).rejects.toThrow("Edit Mode");

    expect(await repository.loadArticles()).toEqual([]);
  });

  it("refuses to edit, trash, restore or destroy one", async () => {
    const { repository, store } = await visitorStore([onTheSphere]);

    await expect(
      store.editArticle(onTheSphere.id, { title: "Tampered", body: paragraphs("Nope.") }),
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

  it("refuses to bond an Article to an Atom, or to unbond one", async () => {
    const bonding = {
      id: "bonding-physics",
      articleId: onTheSphere.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    };
    const repository = new FakeArticleRepository({
      articles: [onTheSphere],
      bondings: [bonding],
    });
    const store = createArticleStore(
      repository,
      new FakeAuthProvider({ owner: OWNER }),
    );
    await store.load();

    await expect(
      store.addBonding({
        articleId: onTheSphere.id,
        atomId: "atom-graphics",
        name: "Snuck in",
      }),
    ).rejects.toThrow("Edit Mode");
    await expect(store.deleteBonding(bonding.id)).rejects.toThrow("Edit Mode");

    expect(await repository.loadBondings()).toEqual([bonding]);
  });
});

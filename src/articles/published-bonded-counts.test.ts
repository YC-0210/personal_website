import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import { paragraphs } from "./article-body";
import type { Article } from "./domain";
import { FakeArticleRepository } from "./fake-article-repository";
import { createArticleStore } from "./article-store";

/**
 * The count the Sphere reads: how many Articles have been written about each
 * Atom (issue #30). It is what an Atom's moons count, and what its Rank — its
 * size and its orbit depth — is derived from.
 *
 * The rule is one sentence: **live, published, bonded**. Deliberately *not* the
 * rule `bondedArticles()` uses. That one answers "what may this reader open",
 * so it includes the Owner's own drafts; this one answers "what has been
 * written about this Atom", and must give the same answer to everybody. Moons
 * and Rank both hang off it, so a reader-dependent count would resize Atoms and
 * move orbits the moment the Owner signed in.
 */

const PUBLISHED = "2026-07-30T12:00:00.000Z";
const OWNER = { email: "owner@example.com", password: "correct-horse" };

function published(id: string, title: string): Article {
  return {
    id,
    title,
    body: paragraphs(`${title}, at length.`),
    deletedAt: null,
    publishedAt: PUBLISHED,
  };
}

const onPhysics = published("article-physics", "On classical physics");
const onEconomics = published("article-economics", "On Economics");

async function ownerStore(articles: Article[]) {
  const store = createArticleStore(
    new FakeArticleRepository({ articles }),
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
  );
  await store.restoreSession();
  await store.load();
  return store;
}

describe("How many Articles have been written about an Atom", () => {
  it("counts the published Articles bonded to each Atom", async () => {
    const store = await ownerStore([onPhysics, onEconomics]);

    await store.addBonding({
      articleId: onPhysics.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-economics",
      name: "What economics borrowed",
    });

    expect(store.publishedBondedCounts()).toEqual({
      "atom-physics": 2,
      "atom-economics": 1,
    });
  });

  it("does not count a draft, even for the Owner who can read it", async () => {
    // The one place #28's "the count differs by who is looking" must not be
    // inherited. Moons and Rank hang off this number, so a draft counting here
    // would resize Atoms and move orbits the moment the Owner signed in.
    const store = await ownerStore([onPhysics]);

    const draftId = await store.startArticleBondedTo({
      atomId: "atom-physics",
      name: "Still being written",
    });
    await store.addBonding({
      articleId: onPhysics.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });

    // The Owner can open that draft from the Dossier — and it still buys the
    // Atom nothing on the Sphere.
    expect(store.getArticle(draftId)).toBeDefined();
    expect(store.publishedBondedCounts()).toEqual({ "atom-physics": 1 });

    await store.publishArticle(draftId);

    expect(store.publishedBondedCounts()).toEqual({ "atom-physics": 2 });
  });

  it("does not count an Article in the Trash, and counts it again once restored", async () => {
    const store = await ownerStore([onPhysics, onEconomics]);
    await store.addBonding({
      articleId: onPhysics.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });
    await store.addBonding({
      articleId: onEconomics.id,
      atomId: "atom-physics",
      name: "Where the mechanics metaphor breaks",
    });

    await store.deleteArticle(onPhysics.id);
    expect(store.publishedBondedCounts()).toEqual({ "atom-physics": 1 });

    await store.restoreArticle(onPhysics.id);
    expect(store.publishedBondedCounts()).toEqual({ "atom-physics": 2 });
  });

  it("leaves out an Atom nothing has been written about", async () => {
    // Absent rather than zero: listing every Atom would mean this store
    // knowing what Atoms exist, and that is the Sphere's to know.
    const store = await ownerStore([onPhysics]);

    expect(store.publishedBondedCounts()).toEqual({});
  });

  it("stops counting an Article destroyed for good", async () => {
    const store = await ownerStore([onPhysics]);
    await store.addBonding({
      articleId: onPhysics.id,
      atomId: "atom-physics",
      name: "How classical physics connects to economics",
    });

    await store.deleteArticle(onPhysics.id);
    await store.destroyArticle(onPhysics.id);

    expect(store.publishedBondedCounts()).toEqual({});
  });
});

import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import { paragraphs } from "./article-body";
import type { Article } from "./domain";
import { FakeArticleRepository } from "./fake-article-repository";
import { createArticleStore } from "./article-store";
import { publishedOn } from "./published-date";

/**
 * The date a reader sees under an Article's title is the *latest* publish
 * (issue #31), and that only means something if the two acts that write to an
 * Article are kept apart: publishing stamps the date, autosave does not.
 *
 * Autosave runs continuously while the Owner writes (ADR-0008), so an
 * `updateArticle` that touched the stamp would resurface a two-year-old piece
 * as new every time a typo was fixed in it.
 */

const FIRST_PUBLISH = "2026-07-30T12:00:00.000Z";
const OWNER = { email: "owner@example.com", password: "correct-horse" };

const draft: Article = {
  id: "article-1",
  title: "On borrowed metaphors",
  body: paragraphs("Economics took its mechanics from physics."),
  deletedAt: null,
  publishedAt: null,
};

async function ownerStore(articles: Article[]) {
  const repository = new FakeArticleRepository({
    articles,
    now: FIRST_PUBLISH,
  });
  const store = createArticleStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
  );
  await store.restoreSession();
  await store.load();
  return { repository, store };
}

describe("The date under an Article's title", () => {
  it("appears when the draft is published, and not before", async () => {
    const { store } = await ownerStore([draft]);
    expect(publishedOn(store.getArticle(draft.id)!.publishedAt)).toBeNull();

    await store.publishArticle(draft.id);

    expect(publishedOn(store.getArticle(draft.id)!.publishedAt)).toBe(
      "30 July 2026",
    );
  });

  it("moves forward when the Article is published again", async () => {
    const { repository, store } = await ownerStore([draft]);
    await store.publishArticle(draft.id);

    // The Owner comes back to a published piece, corrects it, publishes again.
    repository.setNow("2026-08-14T09:00:00.000Z");
    await store.publishArticle(draft.id);

    expect(publishedOn(store.getArticle(draft.id)!.publishedAt)).toBe(
      "14 August 2026",
    );
  });

  it("stays put when autosave rewrites the Article", async () => {
    const { repository, store } = await ownerStore([draft]);
    await store.publishArticle(draft.id);
    repository.setNow("2026-08-14T09:00:00.000Z");

    // What autosave calls, over and over, while a typo is being fixed.
    await store.editArticle(draft.id, {
      title: "On borrowed metaphors",
      body: paragraphs("Economics took its mechanics from physics, in 1871."),
    });

    expect(publishedOn(store.getArticle(draft.id)!.publishedAt)).toBe(
      "30 July 2026",
    );
  });
});

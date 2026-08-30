import { describe, expect, it } from "vitest";

import { paragraphs } from "@/articles/article-body";
import { FakeAuthProvider } from "@/sphere/fake-auth-provider";
import { FakeProjectRepository } from "./fake-project-repository";
import { createProjectStore } from "./project-store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

async function ownerStore() {
  const repository = new FakeProjectRepository();
  return { repository, store: await storeOver(repository, true) };
}

/**
 * A second store over the same repository, reading as whoever is asking.
 *
 * The fake does not enforce RLS — it hands every row to anyone, exactly as it
 * would hand the Owner's rows to a Visitor. That is deliberate: what keeps a
 * Project off a Visitor's screen *here* is the store's own read rule, so these
 * tests hold that rule rather than the database's identical one.
 */
async function storeOver(repository: FakeProjectRepository, signedIn: boolean) {
  const store = createProjectStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn }),
  );
  await store.restoreSession();
  await store.load();
  return store;
}

describe("Starting a Project", () => {
  it("saves a name and a description, and hands back the id", async () => {
    const { store } = await ownerStore();

    const id = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    expect(store.getProject(id)).toEqual({
      id,
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
      deletedAt: null,
    });
  });
});

describe("Writing a Daylog Entry", () => {
  it("saves it into the Project as a draft, dated by the Owner", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    // The date is the Owner's, not `created_at`: Monday's session gets written
    // up on Tuesday morning, and a stamp they cannot set makes the log lie.
    const entryId = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("RLS has to reach through the join, or the Atom leaks."),
    });

    expect(store.entries(projectId)).toEqual([
      {
        id: entryId,
        projectId,
        date: "2026-08-20",
        body: paragraphs("RLS has to reach through the join, or the Atom leaks."),
        // The store of record's, and only ever a tie-break between two Entries
        // on the same date.
        createdAt: expect.any(String),
        publishedAt: null,
      },
    ]);
  });
});

describe("What a Visitor may see of a Project", () => {
  it("is nothing at all until one of its Entries is published", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });
    const entryId = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Started on the force-directed layout."),
    });

    // The Owner is working on it, so they see it. Nobody else does — a Project
    // with nothing published is a name for a thing that has not happened yet.
    expect(store.projects().map((project) => project.id)).toEqual([projectId]);
    expect((await storeOver(repository, false)).projects()).toEqual([]);

    await store.publishEntry(entryId);

    expect(
      (await storeOver(repository, false)).projects().map((p) => p.id),
    ).toEqual([projectId]);
  });

  it("does not include a Project whose only published Entry is a draft again", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });
    await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Nothing published here."),
    });

    // A draft Entry is not a published one, however many there are of it.
    await store.addEntry(projectId, {
      date: "2026-08-21",
      body: paragraphs("Still nothing published here."),
    });

    expect((await storeOver(repository, false)).projects()).toEqual([]);
  });
});

describe("Reading a Project's Daylog", () => {
  it("keeps the Owner's draft days out of a Visitor's log", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });
    const published = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Force-directed angles, rank-driven radius."),
    });
    await store.addEntry(projectId, {
      date: "2026-08-21",
      body: paragraphs("Half a thought, not finished."),
    });
    await store.publishEntry(published);

    // The Owner sees both, because one of them is theirs to finish.
    expect(store.entries(projectId)).toHaveLength(2);

    const visitor = await storeOver(repository, false);
    expect(visitor.entries(projectId).map((entry) => entry.id)).toEqual([
      published,
    ]);
  });
});

describe("The order of a Daylog", () => {
  it("puts the newest day first, and the later write first within a day", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    // Written out of order on purpose: the log is ordered by the day the work
    // happened, not by the day it was typed up.
    await store.addEntry(projectId, { date: "2026-08-18", body: paragraphs("Monday.") });
    await store.addEntry(projectId, { date: "2026-08-22", body: paragraphs("Friday morning.") });
    await store.addEntry(projectId, { date: "2026-08-20", body: paragraphs("Wednesday.") });
    // A second Friday entry: you write in the morning and learn something else
    // at night. Both save; the later one reads first.
    await store.addEntry(projectId, { date: "2026-08-22", body: paragraphs("Friday night.") });

    expect(store.entries(projectId).map((entry) => entry.date)).toEqual([
      "2026-08-22",
      "2026-08-22",
      "2026-08-20",
      "2026-08-18",
    ]);
    expect(store.entries(projectId)[0].body).toEqual(paragraphs("Friday night."));
  });
});

describe("When a Project was last logged", () => {
  it("is its newest published day, and reads the same for the Owner as for anyone", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    const published = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Wednesday, and finished."),
    });
    await store.publishEntry(published);

    // A later day, still a draft. It must not move the date the list shows —
    // otherwise signing in changes a fact about the Project, and the Owner
    // would be reading a Projects list no Visitor ever sees.
    await store.addEntry(projectId, {
      date: "2026-08-27",
      body: paragraphs("Not finished, not published."),
    });

    expect(store.lastLoggedOn(projectId)).toBe("2026-08-20");
    expect((await storeOver(repository, false)).lastLoggedOn(projectId)).toBe(
      "2026-08-20",
    );
  });

  it("is nothing at all for a Project with no published day", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });
    await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("A draft and nothing else."),
    });

    expect(store.lastLoggedOn(projectId)).toBeNull();
  });
});

describe("The order of the Projects list", () => {
  async function threeProjects() {
    const { repository, store } = await ownerStore();

    const older = await store.addProject({ name: "Older", description: "" });
    const newer = await store.addProject({ name: "Newer", description: "" });
    const unpublished = await store.addProject({ name: "Unpublished", description: "" });

    const a = await store.addEntry(older, { date: "2026-08-10", body: paragraphs("Ten.") });
    const b = await store.addEntry(newer, { date: "2026-08-25", body: paragraphs("Twenty-five.") });
    await store.addEntry(unpublished, { date: "2026-08-29", body: paragraphs("A draft.") });
    await store.publishEntry(a);
    await store.publishEntry(b);

    return { repository, store, older, newer, unpublished };
  }

  it("puts work with nothing published at the top, for the Owner", async () => {
    const { store, older, newer, unpublished } = await threeProjects();

    // Not buried at the bottom: a Project you started this morning and have not
    // published from is the one you are actually working on. It has no date to
    // sort by, and that absence is what puts it first.
    expect(store.projects().map((project) => project.id)).toEqual([
      unpublished,
      newer,
      older,
    ]);
  });

  it("sorts the rest by the day each was last logged, newest first", async () => {
    const { repository, older, newer } = await threeProjects();
    const visitor = await storeOver(repository, false);

    expect(visitor.projects().map((project) => project.id)).toEqual([
      newer,
      older,
    ]);
  });
});

describe("Trashing a Project", () => {
  it("takes it out of the list and out of a Visitor's reach, and can be undone", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });
    const entryId = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Published, and about to be trashed anyway."),
    });
    await store.publishEntry(entryId);

    await store.deleteProject(projectId);

    // Gone from both lists at once. Months of logged work is not something to
    // lose to one click, so the row stays and only the mark is new.
    expect(store.projects()).toEqual([]);
    expect((await storeOver(repository, false)).projects()).toEqual([]);
    expect(store.trash().map((project) => project.id)).toEqual([projectId]);

    await store.restoreProject(projectId);

    expect(store.projects().map((project) => project.id)).toEqual([projectId]);
    expect(store.trash()).toEqual([]);
  });
});

describe("Autosaving a Daylog Entry", () => {
  it("cannot change whether it is published, in either direction", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    // This is the invariant ADR-0008 exists for. `editEntry` is what autosave
    // calls, so if it could publish, every half-typed sentence would be public
    // the moment the debounce fired.
    const draft = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Half a thought."),
    });
    await store.editEntry(draft, { date: "2026-08-20", body: paragraphs("Most of a thought.") });
    await store.editEntry(draft, { date: "2026-08-20", body: paragraphs("A whole thought.") });

    expect(store.entries(projectId)[0].publishedAt).toBeNull();
    expect(store.entries(projectId)[0].body).toEqual(paragraphs("A whole thought."));

    // And the other way: revising a published day does not unpublish it.
    await store.publishEntry(draft);
    const publishedAt = store.entries(projectId)[0].publishedAt;
    await store.editEntry(draft, { date: "2026-08-20", body: paragraphs("A corrected thought.") });

    expect(store.entries(projectId)[0].publishedAt).toBe(publishedAt);
  });

  it("can move the day an Entry is filed under", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({ name: "Knowledge Sphere", description: "" });
    const entryId = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("Filed under the wrong day."),
    });

    await store.editEntry(entryId, {
      date: "2026-08-19",
      body: paragraphs("Filed under the wrong day."),
    });

    expect(store.entries(projectId)[0].date).toBe("2026-08-19");
  });
});

describe("Deleting a Daylog Entry", () => {
  it("takes the day out for good, and the Project's date falls back to the one before", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({ name: "Knowledge Sphere", description: "" });

    const earlier = await store.addEntry(projectId, {
      date: "2026-08-18",
      body: paragraphs("Monday."),
    });
    const latest = await store.addEntry(projectId, {
      date: "2026-08-22",
      body: paragraphs("Friday, and wrong."),
    });
    await store.publishEntry(earlier);
    await store.publishEntry(latest);

    expect(store.lastLoggedOn(projectId)).toBe("2026-08-22");

    await store.destroyEntry(latest);

    // Nothing had to be corrected for this to be right: the date was never
    // stored, so removing the day it came from is the whole update.
    expect(store.entries(projectId).map((entry) => entry.id)).toEqual([earlier]);
    expect(store.lastLoggedOn(projectId)).toBe("2026-08-18");
  });

  it("can empty a Project back out of a Visitor's sight", async () => {
    const { repository, store } = await ownerStore();
    const projectId = await store.addProject({ name: "Knowledge Sphere", description: "" });
    const only = await store.addEntry(projectId, {
      date: "2026-08-18",
      body: paragraphs("The only published day."),
    });
    await store.publishEntry(only);

    expect((await storeOver(repository, false)).projects()).toHaveLength(1);

    await store.destroyEntry(only);

    // Visibility is derived, so it reverses on its own. A stored flag would
    // still be saying this Project was public.
    expect((await storeOver(repository, false)).projects()).toEqual([]);
  });
});

describe("Renaming a Project", () => {
  it("rewrites the name and the description, and leaves the Daylog alone", async () => {
    const { store } = await ownerStore();
    const projectId = await store.addProject({ name: "Sphere thing", description: "Vague." });
    const entryId = await store.addEntry(projectId, {
      date: "2026-08-20",
      body: paragraphs("A day that must survive the rename."),
    });
    await store.publishEntry(entryId);

    await store.editProject(projectId, {
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
    });

    expect(store.getProject(projectId)).toEqual({
      id: projectId,
      name: "Knowledge Sphere",
      description: "The interactive sphere on the homepage.",
      deletedAt: null,
    });
    expect(store.entries(projectId)).toHaveLength(1);
    expect(store.lastLoggedOn(projectId)).toBe("2026-08-20");
  });
});

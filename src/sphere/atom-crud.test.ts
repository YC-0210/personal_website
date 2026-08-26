import { beforeEach, describe, expect, it } from "vitest";

import type { Atom, Connection } from "./domain";
import { FakeAuthProvider } from "./fake-auth-provider";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore, type SphereStore } from "./store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

const typescript: Atom = {
  id: "atom-typescript",
  label: "TypeScript",
  description: "Types at the edges, inference in the middle.",
  learningState: "ongoing",
};

async function ownerStore(options?: {
  atoms?: Atom[];
  connections?: Connection[];
}) {
  const repository = new FakeSphereRepository({
    atoms: options?.atoms ?? [typescript],
    connections: options?.connections,
  });
  const store = createSphereStore(
    repository,
    new FakeAuthProvider({ owner: OWNER, signedIn: true }),
  );
  await store.restoreSession();
  await store.load();
  return { repository, store };
}

describe("Owner Atom CRUD", () => {
  let store: SphereStore;

  beforeEach(async () => {
    ({ store } = await ownerStore());
  });

  it("adds an Atom that is then part of the Sphere", async () => {
    await store.addAtom({
      label: "Three.js",
      description: "Scene graphs and shaders.",
    });

    const added = store
      .getState()
      .atoms.find((atom) => atom.label === "Three.js");
    expect(added).toBeDefined();
    expect(added!.description).toBe("Scene graphs and shaders.");
    expect(store.hasAtom(added!.id)).toBe(true);

    // Saved, not just shown: it survives a round-trip through the repository.
    await store.load();
    expect(store.getAtom(added!.id)).toEqual(added);
  });

  it("lays the new Atom out at once, without reloading the Sphere", async () => {
    const { repository, store } = await ownerStore();
    store.setArticleCounts({ [typescript.id]: 4 });
    const loadsBefore = repository.loadCount;
    // The incumbent holds the top Rank: it is the only one written about.
    expect(store.getState().layout[typescript.id].rank).toBe(1);

    await store.addAtom({
      label: "Postgres",
      description: "Relational modelling.",
    });

    const { atoms, layout } = store.getState();
    const postgres = atoms.find((atom) => atom.label === "Postgres")!;
    // Placed immediately, and placed where an Atom nobody has written about
    // belongs: rank 0, out on the shell. Rank is earned by being written
    // about (#30), so a newcomer cannot arrive holding any of it.
    expect(layout[postgres.id]).toBeDefined();
    expect(layout[postgres.id].rank).toBe(0);
    expect(layout[postgres.id].size).toBeLessThan(layout[typescript.id].size);
    expect(layout[postgres.id].orbitRadius).toBeGreaterThan(
      layout[typescript.id].orbitRadius,
    );
    // And the incumbent was not disturbed by its arrival.
    expect(layout[typescript.id].rank).toBe(1);
    expect(repository.loadCount).toBe(loadsBefore);
  });

  it("edits an Atom in place and re-Ranks on the new hours", async () => {
    const three: Atom = {
      id: "atom-three",
      label: "Three.js",
      description: "Scene graphs and shaders.",
      learningState: "ongoing",
    };
    const { repository, store } = await ownerStore({
      atoms: [typescript, three],
    });
    const loadsBefore = repository.loadCount;

    await store.editAtom(three.id, {
      label: "Three.js",
      description: "Scene graphs, materials, and the render loop.",
    });

    const edited = store.getAtom(three.id)!;
    expect(edited.description).toBe(
      "Scene graphs, materials, and the render loop.",
    );
    expect(store.getState().atoms).toHaveLength(2);
    // Rank is no longer editable from here: it comes from the Articles written
    // about an Atom (#30), so an edit changes what the Atom *says* and nothing
    // about where it sits. `rank-and-layout.test.ts` holds the other half.
    expect(repository.loadCount).toBe(loadsBefore);
  });

  it("deletes an Atom, and it stays gone across a reload", async () => {
    const three: Atom = {
      id: "atom-three",
      label: "Three.js",
      description: "Scene graphs and shaders.",
      learningState: "ongoing",
    };
    const { store } = await ownerStore({ atoms: [typescript, three] });

    await store.deleteAtom(three.id);

    expect(store.hasAtom(three.id)).toBe(false);
    expect(store.getState().layout[three.id]).toBeUndefined();
    expect(store.getState().atoms).toEqual([typescript]);

    await store.load();
    expect(store.hasAtom(three.id)).toBe(false);
  });

  it("takes an Atom's Connections with it, and leaves the rest standing", async () => {
    const three: Atom = {
      id: "atom-three",
      label: "Three.js",
      description: "Scene graphs and shaders.",
      learningState: "ongoing",
    };
    const postgres: Atom = {
      id: "atom-postgres",
      label: "Postgres",
      description: "Relational modelling.",
      learningState: "ongoing",
    };
    const typescriptToThree: Connection = {
      id: "connection-ts-three",
      fromAtomId: typescript.id,
      toAtomId: three.id,
      strength: 0.8,
      description: "r3f is written in TypeScript.",
    };
    const threeToPostgres: Connection = {
      id: "connection-three-postgres",
      fromAtomId: three.id,
      toAtomId: postgres.id,
      strength: 0.2,
      description: "Scene data has to live somewhere.",
    };
    const typescriptToPostgres: Connection = {
      id: "connection-ts-postgres",
      fromAtomId: typescript.id,
      toAtomId: postgres.id,
      strength: 0.4,
      description: "Typed queries.",
    };
    const { store } = await ownerStore({
      atoms: [typescript, three, postgres],
      connections: [typescriptToThree, threeToPostgres, typescriptToPostgres],
    });

    await store.deleteAtom(three.id);

    expect(store.getState().connections).toEqual([typescriptToPostgres]);
    expect(store.connectionsForAtom(three.id)).toEqual([]);

    // The cascade is the database's, so it has to hold on the way back too.
    await store.load();
    expect(store.getState().connections).toEqual([typescriptToPostgres]);
  });

  it("lets the selection go when the selected Atom is the one deleted", async () => {
    const three: Atom = {
      id: "atom-three",
      label: "Three.js",
      description: "Scene graphs and shaders.",
      learningState: "ongoing",
    };
    const { store } = await ownerStore({ atoms: [typescript, three] });
    store.selectAtom(three.id);

    await store.deleteAtom(three.id);

    expect(store.getState().selectedAtomId).toBeNull();
    expect(store.getState().emphasis.atoms[typescript.id]).toBe("neutral");
  });
});

describe("Atom writes outside Edit Mode", () => {
  /**
   * RLS is what actually stops a visitor writing. This is the near side of that
   * same rule: a store with no Owner in it does not send the write at all.
   */
  async function visitorStore() {
    const repository = new FakeSphereRepository({ atoms: [typescript] });
    const store = createSphereStore(
      repository,
      new FakeAuthProvider({ owner: OWNER }),
    );
    await store.load();
    return { repository, store };
  }

  it("refuses to add an Atom", async () => {
    const { repository, store } = await visitorStore();

    await expect(
      store.addAtom({ label: "Sneaked in", description: "" }),
    ).rejects.toThrow("Edit Mode");

    expect(store.getState().atoms).toEqual([typescript]);
    expect((await repository.loadSnapshot()).atoms).toEqual([typescript]);
  });

  it("refuses to edit an Atom", async () => {
    const { repository, store } = await visitorStore();

    await expect(
      store.editAtom(typescript.id, {
        label: "Tampered",
        description: "",
      }),
    ).rejects.toThrow("Edit Mode");

    expect((await repository.loadSnapshot()).atoms).toEqual([typescript]);
  });

  it("refuses to delete an Atom", async () => {
    const { repository, store } = await visitorStore();

    await expect(store.deleteAtom(typescript.id)).rejects.toThrow("Edit Mode");

    expect((await repository.loadSnapshot()).atoms).toEqual([typescript]);
  });
});

describe("when an Atom write fails", () => {
  it("reports it and leaves the Sphere standing", async () => {
    const { repository, store } = await ownerStore();
    repository.failWith(new Error("network is down"));

    await expect(
      store.addAtom({ label: "Three.js", description: "" }),
    ).rejects.toThrow("network is down");

    const { status, atoms, error, writeError } = store.getState();
    expect(writeError).toBe("network is down");
    // A failed *write* is not a failed *load* — the Sphere is still on screen.
    expect(status).toBe("ready");
    expect(error).toBeNull();
    expect(atoms).toEqual([typescript]);
  });

  it("clears the report once a write succeeds", async () => {
    const { repository, store } = await ownerStore();
    repository.failWith(new Error("network is down"));
    await expect(
      store.addAtom({ label: "Three.js", description: "" }),
    ).rejects.toThrow();

    repository.failWith(null);
    await store.addAtom({ label: "Three.js", description: "" });

    expect(store.getState().writeError).toBeNull();
    expect(store.getState().atoms).toHaveLength(2);
  });
});

/**
 * Where the Owner is with an Atom — still learning it, or done — drives the
 * colour of the moons orbiting inside it, so it is data the Sphere reads rather
 * than a note on the side.
 */
describe("An Atom's learning state", () => {
  it("starts out as still being learned when the Owner does not say", async () => {
    const { store } = await ownerStore({ atoms: [] });

    await store.addAtom({
      label: "Rust",
      description: "Ownership, borrowing, and a lot of fighting.",
    });

    expect(store.getState().atoms[0].learningState).toBe("ongoing");
  });

  it("keeps the state the Owner chose, through a save and a reload", async () => {
    const { store } = await ownerStore({ atoms: [] });

    await store.addAtom({
      label: "Latin",
      description: "Enough to read an inscription.",
      learningState: "learned",
    });

    expect(store.getState().atoms[0].learningState).toBe("learned");

    // Saved, not merely shown: it survives a round-trip through the repository.
    await store.load();
    expect(store.getState().atoms[0].learningState).toBe("learned");
  });

  it("leaves the state alone when an edit does not mention it", async () => {
    const { store } = await ownerStore({ atoms: [] });
    await store.addAtom({
      label: "Latin",
      description: "Enough to read an inscription.",
      learningState: "learned",
    });
    const latin = store.getState().atoms[0];

    // Correcting the hours is not a claim about whether the Owner is done.
    await store.editAtom(latin.id, {
      label: latin.label,
      description: latin.description,
    });

    expect(store.getAtom(latin.id)?.learningState).toBe("learned");
  });

  it("moves an Atom from still-learning to learned, and back", async () => {
    const { store } = await ownerStore();
    const draft = {
      label: typescript.label,
      description: typescript.description,
    };

    await store.editAtom(typescript.id, { ...draft, learningState: "learned" });
    expect(store.getAtom(typescript.id)?.learningState).toBe("learned");

    await store.editAtom(typescript.id, { ...draft, learningState: "ongoing" });
    expect(store.getAtom(typescript.id)?.learningState).toBe("ongoing");
  });
});

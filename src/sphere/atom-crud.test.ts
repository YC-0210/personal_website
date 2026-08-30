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
    };
    const postgres: Atom = {
      id: "atom-postgres",
      label: "Postgres",
      description: "Relational modelling.",
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
 * An Atom is a label and a description, and nothing else the Owner did not
 * type.
 *
 * Two fields have now been taken off it — `hoursSpent` (#30) and the Learning
 * State — and both went for the same reason: a value nothing in the site checks
 * is worse than no value, because it reads as a fact. This is what stops a
 * third one arriving quietly. It is deliberately a shape assertion; the point is
 * that the store adds nothing of its own on the way through.
 */
describe("What an Atom carries", () => {
  it("carries the label and description the Owner supplied, and an id", async () => {
    const { store } = await ownerStore({ atoms: [] });

    await store.addAtom({
      label: "Rust",
      description: "Ownership, borrowing, and a lot of fighting.",
    });

    expect(Object.keys(store.getState().atoms[0]).sort()).toEqual([
      "description",
      "id",
      "label",
    ]);
  });

  it("adds nothing of its own when the Owner edits one", async () => {
    const { store } = await ownerStore();

    await store.editAtom(typescript.id, {
      label: "TypeScript",
      description: "Types at the edges, inference in the middle.",
    });

    expect(Object.keys(store.getAtom(typescript.id)!).sort()).toEqual([
      "description",
      "id",
      "label",
    ]);
  });
});

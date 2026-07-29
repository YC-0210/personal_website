import { describe, expect, it } from "vitest";

import type { Atom, Connection } from "./domain";
import { FakeAuthProvider } from "./fake-auth-provider";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore } from "./store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

const typescript: Atom = {
  id: "atom-typescript",
  label: "TypeScript",
  description: "Types at the edges, inference in the middle.",
  hoursSpent: 400,
};

const threeJs: Atom = {
  id: "atom-three",
  label: "Three.js",
  description: "Scene graphs and shaders.",
  hoursSpent: 200,
};

const postgres: Atom = {
  id: "atom-postgres",
  label: "Postgres",
  description: "Relational modelling.",
  hoursSpent: 100,
};

const typescriptToThree: Connection = {
  id: "connection-ts-three",
  fromAtomId: typescript.id,
  toAtomId: threeJs.id,
  strength: 0.8,
  description: "r3f is written in TypeScript.",
};

async function ownerStore(options?: { connections?: Connection[] }) {
  const repository = new FakeSphereRepository({
    atoms: [typescript, threeJs, postgres],
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

describe("Owner Connection CRUD", () => {
  it("adds a Connection that both its Atoms then answer to", async () => {
    const { repository, store } = await ownerStore();
    const loadsBefore = repository.loadCount;

    await store.addConnection({
      fromAtomId: typescript.id,
      toAtomId: postgres.id,
      strength: 0.4,
      description: "Typed queries.",
    });

    const [added] = store.getState().connections;
    expect(added.strength).toBe(0.4);
    expect(added.description).toBe("Typed queries.");
    expect(store.connectionsForAtom(typescript.id)).toEqual([added]);
    expect(store.connectionsForAtom(postgres.id)).toEqual([added]);
    expect(repository.loadCount).toBe(loadsBefore);
  });

  it("edits a Connection's Strength and description in place", async () => {
    const { repository, store } = await ownerStore({
      connections: [typescriptToThree],
    });
    const loadsBefore = repository.loadCount;

    await store.editConnection(typescriptToThree.id, {
      fromAtomId: typescript.id,
      toAtomId: threeJs.id,
      strength: 0.25,
      description: "Less central than it looked.",
    });

    expect(store.getState().connections).toEqual([
      {
        id: typescriptToThree.id,
        fromAtomId: typescript.id,
        toAtomId: threeJs.id,
        strength: 0.25,
        description: "Less central than it looked.",
      },
    ]);
    expect(repository.loadCount).toBe(loadsBefore);
  });

  it("deletes a Connection, leaving both its Atoms in place", async () => {
    const { store } = await ownerStore({ connections: [typescriptToThree] });

    await store.deleteConnection(typescriptToThree.id);

    expect(store.getState().connections).toEqual([]);
    expect(store.connectionsForAtom(typescript.id)).toEqual([]);
    expect(store.getState().atoms).toHaveLength(3);

    // Gone from the store of record, not just from the screen.
    await store.load();
    expect(store.getState().connections).toEqual([]);
  });
});

describe("connecting Atom A to Atom B", () => {
  it("takes the first Atom clicked as one end and the second as the other", async () => {
    const { store } = await ownerStore();

    store.beginConnection();
    expect(store.getState().pendingConnection).toEqual({
      fromAtomId: null,
      toAtomId: null,
    });

    store.selectAtom(typescript.id);
    expect(store.getState().pendingConnection).toEqual({
      fromAtomId: typescript.id,
      toAtomId: null,
    });

    store.selectAtom(postgres.id);
    expect(store.getState().pendingConnection).toEqual({
      fromAtomId: typescript.id,
      toAtomId: postgres.id,
    });
  });

  it("will not connect an Atom to itself", async () => {
    const { store } = await ownerStore();
    store.beginConnection();

    store.selectAtom(typescript.id);
    store.selectAtom(typescript.id);

    expect(store.getState().pendingConnection).toEqual({
      fromAtomId: typescript.id,
      toAtomId: null,
    });
  });

  it("saves the pair the Owner picked, with the Strength and description they gave", async () => {
    const { repository, store } = await ownerStore();
    const loadsBefore = repository.loadCount;
    store.beginConnection();
    store.selectAtom(typescript.id);
    store.selectAtom(postgres.id);

    await store.completeConnection({
      strength: 0.4,
      description: "Typed queries.",
    });

    expect(store.getState().connections).toEqual([
      {
        id: expect.any(String),
        fromAtomId: typescript.id,
        toAtomId: postgres.id,
        strength: 0.4,
        description: "Typed queries.",
      },
    ]);
    // The gesture is over, so the next Atom click is an ordinary selection.
    expect(store.getState().pendingConnection).toBeNull();
    expect(repository.loadCount).toBe(loadsBefore);
  });

  it("abandons a half-drawn Connection without writing anything", async () => {
    const { store } = await ownerStore();
    store.beginConnection();
    store.selectAtom(typescript.id);

    store.cancelConnection();

    expect(store.getState().pendingConnection).toBeNull();
    expect(store.getState().connections).toEqual([]);

    store.selectAtom(postgres.id);
    expect(store.getState().pendingConnection).toBeNull();
    expect(store.getState().selectedAtomId).toBe(postgres.id);
  });

  it("refuses to complete a Connection whose pair is not picked yet", async () => {
    const { store } = await ownerStore();
    store.beginConnection();
    store.selectAtom(typescript.id);

    await expect(
      store.completeConnection({ strength: 0.4, description: "Too soon." }),
    ).rejects.toThrow("two Atoms");

    expect(store.getState().connections).toEqual([]);
  });

  it("refuses a pair that is already connected, in either direction", async () => {
    // Connections are undirected, so TypeScript-Three.js and Three.js-TypeScript
    // are the same Connection. The schema says so too, via a unique index on the
    // canonically-ordered pair.
    const { store } = await ownerStore({ connections: [typescriptToThree] });
    store.beginConnection();
    store.selectAtom(threeJs.id);
    store.selectAtom(typescript.id);

    await expect(
      store.completeConnection({ strength: 0.9, description: "Again." }),
    ).rejects.toThrow("already connected");

    expect(store.getState().connections).toEqual([typescriptToThree]);
  });
});

describe("Connection writes outside Edit Mode", () => {
  async function visitorStore() {
    const repository = new FakeSphereRepository({
      atoms: [typescript, threeJs, postgres],
      connections: [typescriptToThree],
    });
    const store = createSphereStore(
      repository,
      new FakeAuthProvider({ owner: OWNER }),
    );
    await store.load();
    return { repository, store };
  }

  it("refuses to start drawing one", async () => {
    const { store } = await visitorStore();

    expect(() => store.beginConnection()).toThrow("Edit Mode");
    expect(store.getState().pendingConnection).toBeNull();
  });

  it("refuses to add, edit or delete one", async () => {
    const { repository, store } = await visitorStore();

    await expect(
      store.addConnection({
        fromAtomId: typescript.id,
        toAtomId: postgres.id,
        strength: 0.4,
        description: "Sneaked in.",
      }),
    ).rejects.toThrow("Edit Mode");
    await expect(
      store.editConnection(typescriptToThree.id, {
        fromAtomId: typescript.id,
        toAtomId: threeJs.id,
        strength: 0.1,
        description: "Tampered.",
      }),
    ).rejects.toThrow("Edit Mode");
    await expect(store.deleteConnection(typescriptToThree.id)).rejects.toThrow(
      "Edit Mode",
    );

    expect((await repository.loadSnapshot()).connections).toEqual([
      typescriptToThree,
    ]);
  });
});

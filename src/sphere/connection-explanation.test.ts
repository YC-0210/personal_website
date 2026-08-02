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

const postgres: Atom = {
  id: "atom-postgres",
  label: "Postgres",
  description: "Relational modelling.",
  hoursSpent: 100,
};

async function ownerStore(options?: { connections?: Connection[] }) {
  const repository = new FakeSphereRepository({
    atoms: [typescript, postgres],
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

const pair = { fromAtomId: typescript.id, toAtomId: postgres.id };

describe("a Connection needs an Explanation", () => {
  it("refuses one with neither a description nor an External Link", async () => {
    const { store } = await ownerStore();

    await expect(
      store.addConnection({ ...pair, strength: 0.4, description: "" }),
    ).rejects.toThrow("Explanation");

    expect(store.getState().connections).toEqual([]);
  });

  it("accepts one explained by an External Link alone", async () => {
    const { store } = await ownerStore();

    await store.addConnection({
      ...pair,
      strength: 0.4,
      description: "",
      externalLink: "https://example.com/typed-queries",
    });

    expect(store.getState().connections).toEqual([
      {
        id: expect.any(String),
        ...pair,
        strength: 0.4,
        description: "",
        externalLink: "https://example.com/typed-queries",
      },
    ]);
  });

  it("refuses an External Link that is not a URL", async () => {
    const { store } = await ownerStore();

    await expect(
      store.addConnection({
        ...pair,
        strength: 0.4,
        description: "",
        externalLink: "typed queries, somewhere",
      }),
    ).rejects.toThrow("External Link");

    expect(store.getState().connections).toEqual([]);
  });

  it("refuses to complete a drawn Connection with nothing said about it", async () => {
    const { store } = await ownerStore();
    store.beginConnection();
    store.selectAtom(typescript.id);
    store.selectAtom(postgres.id);

    await expect(
      store.completeConnection({ strength: 0.4, description: "  " }),
    ).rejects.toThrow("Explanation");

    expect(store.getState().connections).toEqual([]);
    // The pair the Owner picked survives the refusal — they lose the words,
    // not the gesture.
    expect(store.getState().pendingConnection).toEqual({
      fromAtomId: typescript.id,
      toAtomId: postgres.id,
    });
  });

  it("refuses to edit the Explanation away from a Connection that has one", async () => {
    const explained: Connection = {
      id: "connection-ts-postgres",
      ...pair,
      strength: 0.4,
      description: "Typed queries.",
    };
    const { store } = await ownerStore({ connections: [explained] });

    await expect(
      store.editConnection(explained.id, {
        ...pair,
        strength: 0.9,
        description: "",
        externalLink: "",
      }),
    ).rejects.toThrow("Explanation");

    expect(store.getState().connections).toEqual([explained]);
  });
});

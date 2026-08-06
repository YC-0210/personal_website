import { beforeEach, describe, expect, it } from "vitest";

import type { Atom, Connection } from "./domain";
import { FakeAuthProvider } from "./fake-auth-provider";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore, type SphereStore } from "./store";

/**
 * The text/list fallback reads the Sphere through `sphereIndex()`: every Atom,
 * each with the Connections that leave it. Screen readers and browsers without
 * WebGL get this instead of the 3D scene, so it must carry the same data.
 */

const typescript: Atom = {
  id: "atom-typescript",
  label: "TypeScript",
  description: "Types at the edges, inference in the middle.",
  hoursSpent: 400,
  learningState: "ongoing",
};

const threeJs: Atom = {
  id: "atom-three",
  label: "Three.js",
  description: "Scene graphs and shaders.",
  hoursSpent: 120,
  learningState: "ongoing",
};

const postgres: Atom = {
  id: "atom-postgres",
  label: "Postgres",
  description: "Relational modelling.",
  hoursSpent: 200,
  learningState: "ongoing",
};

const typescriptToThree: Connection = {
  id: "connection-ts-three",
  fromAtomId: typescript.id,
  toAtomId: threeJs.id,
  strength: 0.8,
  description: "r3f is written in TypeScript.",
};

const threeToPostgres: Connection = {
  id: "connection-three-postgres",
  fromAtomId: threeJs.id,
  toAtomId: postgres.id,
  strength: 0.2,
  description: "Scene data has to live somewhere.",
};

describe("sphereIndex", () => {
  describe("with a loaded Sphere", () => {
    let store: SphereStore;

    beforeEach(async () => {
      store = createSphereStore(
        new FakeSphereRepository({
          atoms: [typescript, threeJs, postgres],
          connections: [typescriptToThree, threeToPostgres],
        }),
      );
      await store.load();
    });

    it("lists every Atom with the Connections that touch it", () => {
      const index = store.sphereIndex();

      const three = index.find((entry) => entry.atom.id === threeJs.id);
      expect(three?.connections).toHaveLength(2);
      expect(three?.connections.map((c) => c.otherAtom.id)).toEqual(
        expect.arrayContaining([typescript.id, postgres.id]),
      );

      const ts = index.find((entry) => entry.atom.id === typescript.id);
      expect(ts?.connections.map((c) => c.otherAtom.id)).toEqual([threeJs.id]);
      expect(ts?.connections[0]?.connection.id).toBe(typescriptToThree.id);

      expect(index).toHaveLength(3);
    });

    it("orders Atoms by Rank, the most-invested first, as the scene weights them", () => {
      const index = store.sphereIndex();

      expect(index.map((entry) => entry.atom.id)).toEqual([
        typescript.id, // 400 hrs
        postgres.id, // 200 hrs
        threeJs.id, // 120 hrs
      ]);
    });
  });

  it("breaks Rank ties alphabetically, so the reading order is stable", async () => {
    const zig: Atom = {
      id: "atom-zig",
      label: "Zig",
      description: "Manual memory, no hidden control flow.",
      hoursSpent: 150,
      learningState: "ongoing",
    };
    const elixir: Atom = {
      id: "atom-elixir",
      label: "Elixir",
      description: "Processes all the way down.",
      hoursSpent: 150,
      learningState: "ongoing",
    };
    const store = createSphereStore(
      new FakeSphereRepository({ atoms: [zig, elixir], connections: [] }),
    );
    await store.load();

    expect(store.sphereIndex().map((entry) => entry.atom.label)).toEqual([
      "Elixir",
      "Zig",
    ]);
  });

  it("reflects an Owner's delete at once, cascade included", async () => {
    const store = createSphereStore(
      new FakeSphereRepository({
        atoms: [typescript, threeJs, postgres],
        connections: [typescriptToThree, threeToPostgres],
      }),
      new FakeAuthProvider({
        owner: { email: "owner@example.com", password: "hunter2" },
      }),
    );
    await store.load();
    await store.signIn("owner@example.com", "hunter2");
    // The list view has already rendered once; the delete must show through it.
    expect(store.sphereIndex()).toHaveLength(3);

    await store.deleteAtom(threeJs.id);

    const index = store.sphereIndex();
    expect(index.map((entry) => entry.atom.id)).toEqual([
      typescript.id,
      postgres.id,
    ]);
    // Both Connections ran through Three.js, so no entry may still offer one.
    expect(index.flatMap((entry) => entry.connections)).toEqual([]);
  });
});

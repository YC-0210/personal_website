import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Atom, Connection } from "./domain";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore, type SphereStore } from "./store";

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
  hoursSpent: 120,
};

const postgres: Atom = {
  id: "atom-postgres",
  label: "Postgres",
  description: "Relational modelling.",
  hoursSpent: 200,
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

function populatedRepository() {
  return new FakeSphereRepository({
    atoms: [typescript, threeJs, postgres],
    connections: [typescriptToThree, threeToPostgres],
  });
}

describe("SphereStore", () => {
  describe("before anything is loaded", () => {
    let store: SphereStore;

    beforeEach(() => {
      store = createSphereStore(new FakeSphereRepository());
    });

    it("starts idle and empty", () => {
      expect(store.getState()).toEqual({
        status: "idle",
        atoms: [],
        connections: [],
        layout: {},
        selectedAtomId: null,
        emphasis: { atoms: {}, connections: {} },
        error: null,
        owner: null,
        isEditMode: false,
        authError: null,
      });
    });

    it("reports no Atom as present", () => {
      expect(store.hasAtom(typescript.id)).toBe(false);
      expect(store.getAtom(typescript.id)).toBeUndefined();
    });

    it("has no Connections for an Atom it has never heard of", () => {
      expect(store.connectionsForAtom(typescript.id)).toEqual([]);
    });
  });

  describe("with an empty Sphere", () => {
    let repository: FakeSphereRepository;
    let store: SphereStore;

    beforeEach(async () => {
      repository = new FakeSphereRepository();
      store = createSphereStore(repository);
      await store.load();
    });

    it("becomes ready with nothing in it", () => {
      expect(store.getState()).toEqual({
        status: "ready",
        atoms: [],
        connections: [],
        layout: {},
        selectedAtomId: null,
        emphasis: { atoms: {}, connections: {} },
        error: null,
        owner: null,
        isEditMode: false,
        authError: null,
      });
    });

    it("ignores an attempt to select an Atom that does not exist", () => {
      store.selectAtom("atom-that-was-never-added");

      expect(store.getState().selectedAtomId).toBeNull();
    });

    it("treats clearing an empty selection as a no-op", () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.clearSelection();

      expect(store.getState().selectedAtomId).toBeNull();
      expect(listener).not.toHaveBeenCalled();
    });

    it("can be loaded again and pick up Atoms added since", async () => {
      repository.setSnapshot({ atoms: [typescript], connections: [] });

      await store.load();

      expect(store.getState().atoms).toEqual([typescript]);
      expect(repository.loadCount).toBe(2);
    });
  });

  describe("with a populated Sphere", () => {
    let repository: FakeSphereRepository;
    let store: SphereStore;

    beforeEach(async () => {
      repository = populatedRepository();
      store = createSphereStore(repository);
      await store.load();
    });

    it("exposes every Atom and Connection", () => {
      expect(store.getState().atoms).toHaveLength(3);
      expect(store.getState().connections).toHaveLength(2);
      expect(store.getState().status).toBe("ready");
    });

    it("looks an Atom up by id", () => {
      expect(store.getAtom(threeJs.id)).toEqual(threeJs);
      expect(store.hasAtom(threeJs.id)).toBe(true);
    });

    it("finds Connections at either end of an Atom", () => {
      expect(store.connectionsForAtom(threeJs.id)).toEqual([
        typescriptToThree,
        threeToPostgres,
      ]);
      expect(store.connectionsForAtom(typescript.id)).toEqual([
        typescriptToThree,
      ]);
    });

    it("selects an Atom and clears back to the default view", () => {
      store.selectAtom(threeJs.id);
      expect(store.getState().selectedAtomId).toBe(threeJs.id);

      store.clearSelection();
      expect(store.getState().selectedAtomId).toBeNull();
    });

    it("notifies subscribers on selection changes until they unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.selectAtom(threeJs.id);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(store.getState());

      store.selectAtom(threeJs.id);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.clearSelection();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("replaces the state object rather than mutating it", () => {
      const before = store.getState();

      store.selectAtom(threeJs.id);

      expect(store.getState()).not.toBe(before);
      expect(before.selectedAtomId).toBeNull();
    });

    it("keeps a selection that survives a reload", async () => {
      store.selectAtom(threeJs.id);

      await store.load();

      expect(store.getState().selectedAtomId).toBe(threeJs.id);
    });

    it("drops a selection whose Atom is gone after a reload", async () => {
      store.selectAtom(threeJs.id);
      repository.setSnapshot({ atoms: [typescript], connections: [] });

      await store.load();

      expect(store.getState().selectedAtomId).toBeNull();
    });

    it("does not hand out state the caller can mutate", async () => {
      const { atoms } = store.getState();
      atoms[0] = { ...atoms[0], label: "Tampered" };

      await store.load();

      expect(store.getState().atoms[0].label).toBe(typescript.label);
    });
  });

  describe("highlight and dim", () => {
    let repository: FakeSphereRepository;
    let store: SphereStore;

    beforeEach(async () => {
      repository = populatedRepository();
      store = createSphereStore(repository);
      await store.load();
    });

    it("emphasises nothing while no Atom is selected", () => {
      expect(store.getState().emphasis).toEqual({
        atoms: {
          [typescript.id]: "neutral",
          [threeJs.id]: "neutral",
          [postgres.id]: "neutral",
        },
        connections: {
          [typescriptToThree.id]: "neutral",
          [threeToPostgres.id]: "neutral",
        },
      });
    });

    it("highlights the selected Atom, its Connections and the Atoms at their far end", () => {
      store.selectAtom(typescript.id);

      const { emphasis } = store.getState();
      expect(emphasis.atoms[typescript.id]).toBe("highlighted");
      expect(emphasis.atoms[threeJs.id]).toBe("highlighted");
      expect(emphasis.connections[typescriptToThree.id]).toBe("highlighted");
    });

    it("dims every Atom and Connection the selection does not reach", () => {
      store.selectAtom(typescript.id);

      const { emphasis } = store.getState();
      expect(emphasis.atoms[postgres.id]).toBe("dimmed");
      expect(emphasis.connections[threeToPostgres.id]).toBe("dimmed");
    });

    it("lets everything back up to its resting weight when the selection clears", () => {
      store.selectAtom(typescript.id);

      store.clearSelection();

      const { emphasis } = store.getState();
      expect(Object.values(emphasis.atoms)).toEqual([
        "neutral",
        "neutral",
        "neutral",
      ]);
      expect(Object.values(emphasis.connections)).toEqual([
        "neutral",
        "neutral",
      ]);
    });

    it("picks up Connections added to a selected Atom on the next load", async () => {
      store.selectAtom(typescript.id);
      const typescriptToPostgres: Connection = {
        id: "connection-ts-postgres",
        fromAtomId: typescript.id,
        toAtomId: postgres.id,
        strength: 0.4,
        description: "Typed queries.",
      };
      repository.setSnapshot({
        atoms: [typescript, threeJs, postgres],
        connections: [typescriptToThree, threeToPostgres, typescriptToPostgres],
      });

      await store.load();

      const { emphasis } = store.getState();
      expect(emphasis.connections[typescriptToPostgres.id]).toBe("highlighted");
      expect(emphasis.atoms[postgres.id]).toBe("highlighted");
    });

    it("drops the highlight when the selected Atom is gone after a load", async () => {
      store.selectAtom(typescript.id);
      repository.setSnapshot({
        atoms: [threeJs, postgres],
        connections: [threeToPostgres],
      });

      await store.load();

      const { emphasis } = store.getState();
      expect(emphasis.atoms[threeJs.id]).toBe("neutral");
      expect(emphasis.connections[threeToPostgres.id]).toBe("neutral");
    });
  });

  describe("following a Connection", () => {
    let store: SphereStore;

    beforeEach(async () => {
      store = createSphereStore(populatedRepository());
      await store.load();
    });

    it("moves the selection to the Atom at the far end", () => {
      store.selectAtom(typescript.id);

      store.selectViaConnection(typescriptToThree.id);

      expect(store.getState().selectedAtomId).toBe(threeJs.id);
    });

    it("ignores a Connection that does not touch the current selection", () => {
      store.selectAtom(typescript.id);

      store.selectViaConnection(threeToPostgres.id);

      expect(store.getState().selectedAtomId).toBe(typescript.id);
    });

    it("arrives from either end of an undirected Connection", () => {
      store.selectAtom(postgres.id);

      store.selectViaConnection(threeToPostgres.id);

      expect(store.getState().selectedAtomId).toBe(threeJs.id);
    });

    it("re-lights the Sphere around the Atom it arrives at", () => {
      store.selectAtom(typescript.id);

      store.selectViaConnection(typescriptToThree.id);

      const { emphasis } = store.getState();
      expect(emphasis.atoms[postgres.id]).toBe("highlighted");
      expect(emphasis.connections[threeToPostgres.id]).toBe("highlighted");
    });

    it("goes nowhere from a Connection it has never heard of", () => {
      store.selectAtom(typescript.id);

      store.selectViaConnection("connection-that-was-never-added");

      expect(store.getState().selectedAtomId).toBe(typescript.id);
    });

    it("goes nowhere while no Atom is selected", () => {
      store.selectViaConnection(typescriptToThree.id);

      expect(store.getState().selectedAtomId).toBeNull();
    });
  });

  describe("exiting", () => {
    let store: SphereStore;

    beforeEach(async () => {
      store = createSphereStore(populatedRepository());
      await store.load();
    });

    it("leaves nothing selected and nothing to describe", () => {
      store.selectAtom(typescript.id);
      store.selectViaConnection(typescriptToThree.id);

      store.clearSelection();

      expect(store.getState().selectedAtomId).toBeNull();
      expect(store.selectedDetail()).toBeNull();
    });
  });

  describe("the detail of the selected Atom", () => {
    let store: SphereStore;

    beforeEach(async () => {
      store = createSphereStore(populatedRepository());
      await store.load();
    });

    it("gives the Atom and, for each Connection, where it leads", () => {
      store.selectAtom(threeJs.id);

      expect(store.selectedDetail()).toEqual({
        atom: threeJs,
        connections: [
          { connection: typescriptToThree, otherAtom: typescript },
          { connection: threeToPostgres, otherAtom: postgres },
        ],
      });
    });

    it("describes the Atom a Connection led to, not the one it left", () => {
      store.selectAtom(typescript.id);

      store.selectViaConnection(typescriptToThree.id);

      expect(store.selectedDetail()?.atom).toEqual(threeJs);
    });

    it("describes an Atom with no Connections at all", async () => {
      const lonely: Atom = {
        id: "atom-lonely",
        label: "Woodworking",
        description: "Nothing to do with the rest of it.",
        hoursSpent: 30,
      };
      const solitaryStore = createSphereStore(
        new FakeSphereRepository({ atoms: [lonely], connections: [] }),
      );
      await solitaryStore.load();

      solitaryStore.selectAtom(lonely.id);

      expect(solitaryStore.selectedDetail()).toEqual({
        atom: lonely,
        connections: [],
      });
    });
  });

  describe("when the repository fails", () => {
    it("surfaces the failure without losing the store", async () => {
      const repository = populatedRepository();
      repository.failWith(new Error("network is down"));
      const store = createSphereStore(repository);

      await store.load();

      expect(store.getState().status).toBe("error");
      expect(store.getState().error).toBe("network is down");
      expect(store.getState().atoms).toEqual([]);
    });

    it("recovers on the next successful load", async () => {
      const repository = populatedRepository();
      repository.failWith(new Error("network is down"));
      const store = createSphereStore(repository);
      await store.load();

      repository.failWith(null);
      await store.load();

      expect(store.getState().status).toBe("ready");
      expect(store.getState().error).toBeNull();
      expect(store.getState().atoms).toHaveLength(3);
    });
  });
});

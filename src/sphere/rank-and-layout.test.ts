import { describe, expect, it } from "vitest";

import type { Atom } from "./domain";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore } from "./store";

function atom(id: string, hoursSpent: number): Atom {
  return { id, label: id, description: "", hoursSpent };
}

async function sphereOf(atoms: Atom[]) {
  const store = createSphereStore(new FakeSphereRepository({ atoms }));
  await store.load();
  return store;
}

describe("Rank", () => {
  it("gives an Atom with more time spent a larger size", async () => {
    const store = await sphereOf([atom("deep", 400), atom("shallow", 10)]);

    const { layout } = store.getState();

    expect(layout.deep.size).toBeGreaterThan(layout.shallow.size);
  });

  it("pulls a higher-ranked Atom closer to the centre", async () => {
    const store = await sphereOf([atom("deep", 400), atom("shallow", 10)]);

    const { layout } = store.getState();

    expect(layout.deep.orbitRadius).toBeLessThan(layout.shallow.orbitRadius);
  });

  /**
   * The bug issue #24 is about: one towering Atom used to flatten everything
   * else against it. Under the old `hours / mostHours` lerp, 100 hours and 1000
   * hours next to a 10,000-hour Atom both landed within a rounding error of the
   * smallest size and the outer shell — an order of magnitude of the Owner's
   * time, rendered as no difference at all.
   */
  it("keeps an order of magnitude readable even beside a towering Atom", async () => {
    const store = await sphereOf([
      atom("towering", 10_000),
      atom("deep", 1000),
      atom("modest", 100),
    ]);

    const { layout } = store.getState();

    // The size range is 0.055 wide and the orbit range 0.45. A tenfold
    // difference in hours has to buy a visible slice of each; the linear lerp
    // gave these two 0.005 of size and 0.04 of orbit, which reads as identical.
    expect(layout.deep.size - layout.modest.size).toBeGreaterThan(0.01);
    expect(layout.modest.orbitRadius - layout.deep.orbitRadius).toBeGreaterThan(
      0.08,
    );
  });
});

type Vec3 = readonly [number, number, number];

function magnitude([x, y, z]: Vec3): number {
  return Math.hypot(x, y, z);
}

/** Angle between two Atoms as seen from the Sphere's centre, ignoring depth. */
function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cosine = dot / (magnitude(a) * magnitude(b));
  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

describe("Layout", () => {
  it("places every Atom on its own orbit radius", async () => {
    const store = await sphereOf([
      atom("a", 400),
      atom("b", 200),
      atom("c", 10),
    ]);

    const { layout } = store.getState();

    for (const id of ["a", "b", "c"]) {
      expect(magnitude(layout[id].position)).toBeCloseTo(
        layout[id].orbitRadius,
        6,
      );
    }
  });

  const sixAtoms = ["a", "b", "c", "d", "e", "f"].map((id) => atom(id, 100));

  function connect(strength: number) {
    return [
      {
        id: "a-b",
        fromAtomId: "a",
        toAtomId: "b",
        strength,
        description: "",
      },
    ];
  }

  async function angleOfAB(connections: ReturnType<typeof connect>) {
    const store = createSphereStore(
      new FakeSphereRepository({ atoms: sixAtoms, connections }),
    );
    await store.load();
    const { layout } = store.getState();
    return {
      ab: angleBetween(layout.a.position, layout.b.position),
      layout,
    };
  }

  it("pulls a connected pair well in from where it would otherwise sit", async () => {
    const { ab: unconnected } = await angleOfAB([]);
    const { ab: connected } = await angleOfAB(connect(1));

    // Six repelling Atoms leave the pair around 86 degrees apart; a full
    // strength Connection should close that dramatically, not marginally.
    expect(connected).toBeLessThan(unconnected * 0.7);
  });

  it("makes the connected pair the clearly closest pair on the Sphere", async () => {
    const { ab, layout } = await angleOfAB(connect(1));

    const ids = Object.keys(layout);
    const otherAngles = ids.flatMap((x, i) =>
      ids
        .slice(i + 1)
        .filter((y) => !(x === "a" && y === "b"))
        .map((y) => angleBetween(layout[x].position, layout[y].position)),
    );

    // A clear margin, so this can't pass on a rounding-error ordering.
    expect(Math.min(...otherAngles)).toBeGreaterThan(ab + Math.PI / 12);
  });

  it("closes the gap further the stronger the Connection", async () => {
    const { ab: weak } = await angleOfAB(connect(0.1));
    const { ab: strong } = await angleOfAB(connect(1));

    expect(strong).toBeLessThan(weak);
  });

  it("spreads Atoms apart when there are no Connections at all", async () => {
    const store = await sphereOf(
      ["a", "b", "c", "d", "e", "f"].map((id) => atom(id, 100)),
    );

    const { layout } = store.getState();
    const ids = Object.keys(layout);
    const angles = ids.flatMap((x, i) =>
      ids.slice(i + 1).map((y) => angleBetween(layout[x].position, layout[y].position)),
    );

    // Six points spread over a sphere sit roughly 90 degrees apart at worst;
    // anything under 45 would mean they had collapsed together.
    expect(Math.min(...angles)).toBeGreaterThan(Math.PI / 4);
  });

  it("lays the same data out the same way every time", async () => {
    const atoms = ["a", "b", "c", "d", "e"].map((id, i) => atom(id, 100 * i));

    const first = await sphereOf(atoms);
    const second = await sphereOf([...atoms].reverse());

    expect(second.getState().layout).toEqual(first.getState().layout);
  });

  it("re-lays the Sphere out when the data changes", async () => {
    const repository = new FakeSphereRepository({
      atoms: [atom("a", 100), atom("b", 100)],
    });
    const store = createSphereStore(repository);
    await store.load();
    const before = store.getState().layout.a.position;

    repository.setSnapshot({
      atoms: [atom("a", 100), atom("b", 100), atom("c", 100)],
      connections: [],
    });
    await store.load();

    expect(store.getState().layout.c).toBeDefined();
    expect(store.getState().layout.a.position).not.toEqual(before);
  });
});

import { describe, expect, it } from "vitest";

import type { Atom, AtomId } from "./domain";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore } from "./store";

function atom(id: string): Atom {
  return { id, label: id, description: "", learningState: "ongoing" };
}

/**
 * A Sphere, plus how many Articles have been written about each of its Atoms.
 * The counts come from the Article store in the running site (ADR-0007); here
 * they are handed straight in, which is the whole point of the seam.
 */
async function sphereOf(
  atoms: Atom[],
  articleCounts: Record<AtomId, number> = {},
) {
  const store = createSphereStore(new FakeSphereRepository({ atoms }));
  await store.load();
  store.setArticleCounts(articleCounts);
  return store;
}

describe("Rank", () => {
  it("gives an Atom more has been written about a larger size", async () => {
    const store = await sphereOf([atom("deep"), atom("shallow")], {
      deep: 6,
      shallow: 1,
    });

    const { layout } = store.getState();

    expect(layout.deep.size).toBeGreaterThan(layout.shallow.size);
  });

  it("pulls a higher-ranked Atom closer to the centre", async () => {
    const store = await sphereOf([atom("deep"), atom("shallow")], {
      deep: 6,
      shallow: 1,
    });

    const { layout } = store.getState();

    expect(layout.deep.orbitRadius).toBeLessThan(layout.shallow.orbitRadius);
  });

  it("ranks an Atom nothing has been written about at the bottom", async () => {
    const store = await sphereOf([atom("written"), atom("silent")], {
      written: 2,
    });

    const { layout } = store.getState();

    // Absent from the counts, not zero in them — the Sphere reads a missing
    // count as none rather than asking the Article store about every Atom.
    expect(layout.silent.rank).toBe(0);
    expect(layout.written.rank).toBeGreaterThan(0);
  });

  it("reads a Sphere nobody has written about yet as flat", async () => {
    // The honest rendering of "nothing is written yet". No floor is invented
    // to avoid it (decision 6 on #30).
    const store = await sphereOf([atom("a"), atom("b"), atom("c")]);

    const { layout } = store.getState();

    for (const id of ["a", "b", "c"]) {
      expect(layout[id].rank).toBe(0);
    }
  });

  /**
   * The bug issue #24 is about: one towering Atom used to flatten everything
   * else against it. Under a straight `count / mostCount` lerp, everything
   * below the top Atom compresses against the smallest size and the outer
   * shell — a real difference in how much has been written, rendered as none.
   * The log curve was chosen to stop that, and #30 changed only its input.
   */
  it("keeps a real difference readable even beside a towering Atom", async () => {
    const store = await sphereOf(
      [atom("towering"), atom("deep"), atom("modest")],
      { towering: 40, deep: 8, modest: 2 },
    );

    const { layout } = store.getState();

    // The size range is 0.055 wide and the orbit range 0.45. A fourfold
    // difference has to buy a visible slice of each; a linear lerp gives these
    // two 0.008 of size and 0.07 of orbit, which reads as identical.
    expect(layout.deep.size - layout.modest.size).toBeGreaterThan(0.01);
    expect(layout.modest.orbitRadius - layout.deep.orbitRadius).toBeGreaterThan(
      0.08,
    );
  });

  it("re-ranks the Sphere when the writing changes underneath it", async () => {
    // Publishing an Article is a write on a different page; the Sphere has to
    // follow it without being reloaded.
    const store = await sphereOf([atom("a"), atom("b")], { a: 1, b: 4 });
    const before = store.getState().layout.a.size;

    store.setArticleCounts({ a: 9, b: 4 });

    expect(store.getState().layout.a.size).toBeGreaterThan(before);
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
      atom("a"),
      atom("b"),
      atom("c"),
    ]);

    const { layout } = store.getState();

    for (const id of ["a", "b", "c"]) {
      expect(magnitude(layout[id].position)).toBeCloseTo(
        layout[id].orbitRadius,
        6,
      );
    }
  });

  const sixAtoms = ["a", "b", "c", "d", "e", "f"].map((id) => atom(id));

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
      ["a", "b", "c", "d", "e", "f"].map((id) => atom(id)),
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
    const ids = ["a", "b", "c", "d", "e"];
    const atoms = ids.map((id) => atom(id));
    // Distinct Ranks, so a stable layout is a real result rather than five
    // identical Atoms landing anywhere and matching by symmetry.
    const written = Object.fromEntries(ids.map((id, i) => [id, i + 1]));

    const first = await sphereOf(atoms, written);
    const second = await sphereOf([...atoms].reverse(), written);

    expect(second.getState().layout).toEqual(first.getState().layout);
  });

  it("re-lays the Sphere out when the data changes", async () => {
    const repository = new FakeSphereRepository({
      atoms: [atom("a"), atom("b")],
    });
    const store = createSphereStore(repository);
    await store.load();
    const before = store.getState().layout.a.position;

    repository.setSnapshot({
      atoms: [atom("a"), atom("b"), atom("c")],
      connections: [],
    });
    await store.load();

    expect(store.getState().layout.c).toBeDefined();
    expect(store.getState().layout.a.position).not.toEqual(before);
  });
});

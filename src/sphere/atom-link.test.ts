import { describe, expect, it } from "vitest";

import { atomAnchor, atomIdFromHash, atomLink } from "./atom-link";

describe("Linking to an Atom from off the Sphere", () => {
  it("round-trips an Atom id through the link and back", () => {
    expect(atomIdFromHash(new URL(atomLink("atom-physics"), "https://x").hash))
      .toBe("atom-physics");
  });

  it("uses the same anchor the List view already labels its entries with", () => {
    expect(atomLink("atom-physics")).toBe(`/#${atomAnchor("atom-physics")}`);
  });
});

describe("Arriving with a hash that names no Atom", () => {
  it("reads nothing out of it, rather than selecting something arbitrary", () => {
    const notAtomAnchors = [
      "",
      "#",
      "#atom-",
      "#articles",
      "#atomic",
      "atom-x", // no leading #, so not a fragment at all
      "#not-atom-physics", // the prefix has to start it, not merely appear in it
    ];

    for (const hash of notAtomAnchors) {
      expect(atomIdFromHash(hash)).toBeNull();
    }
  });
});

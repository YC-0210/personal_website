import { describe, expect, it } from "vitest";

import { sceneNotice } from "./scene-notice";

describe("A load that failed", () => {
  it("says so on the canvas, with the reason", () => {
    expect(
      sceneNotice({
        status: "error",
        atomCount: 0,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL.",
        isEditMode: false,
      }),
    ).toEqual({
      title: "The Sphere could not be loaded.",
      detail: "Missing NEXT_PUBLIC_SUPABASE_URL.",
    });
  });
});

describe("A Sphere that loaded but holds nothing", () => {
  it("tells a Visitor it is empty rather than showing them a black canvas", () => {
    expect(
      sceneNotice({
        status: "ready",
        atomCount: 0,
        error: null,
        isEditMode: false,
      }),
    ).toEqual({ title: "The Sphere is empty.", detail: null });
  });

  it("tells the Owner what to do about it, once they are in Edit Mode", () => {
    expect(
      sceneNotice({
        status: "ready",
        atomCount: 0,
        error: null,
        isEditMode: true,
      }),
    ).toEqual({
      title: "The Sphere is empty.",
      detail: "Add the first Atom to begin.",
    });
  });
});

describe("A Sphere with something to draw", () => {
  it("says nothing at all — the Atoms are the message", () => {
    expect(
      sceneNotice({
        status: "ready",
        atomCount: 3,
        error: null,
        isEditMode: true,
      }),
    ).toBeNull();
  });

  it("stays quiet while the load is still in flight", () => {
    for (const status of ["idle", "loading"] as const) {
      expect(
        sceneNotice({ status, atomCount: 0, error: null, isEditMode: false }),
      ).toBeNull();
    }
  });

  it("drops a stale failure the moment a reload succeeds", () => {
    // `error` survives into the next `ready` state only if the store forgets to
    // clear it; the notice must follow `status`, not the leftover string.
    expect(
      sceneNotice({
        status: "ready",
        atomCount: 2,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL.",
        isEditMode: false,
      }),
    ).toBeNull();
  });
});

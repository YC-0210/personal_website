import { describe, expect, it } from "vitest";

import { placePanel, type ScreenAtom } from "./panel-placement";

const VIEWPORT = { width: 1200, height: 800 };
const PANEL = { width: 292, height: 300 };

/** An Atom at full weight, big enough to matter, at a screen point. */
function occluderAt(x: number, y: number, radius = 40): ScreenAtom {
  return { id: `atom-at-${x}-${y}`, x, y, radius, weight: 1 };
}

describe("placePanel", () => {
  it("sets the panel beside the Atom when nothing is in the way", () => {
    const placement = placePanel({
      anchor: { x: 400, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [],
    });

    expect(placement.x).toBeGreaterThan(400);
    expect(placement.y).toBeGreaterThan(400 - PANEL.height);
    expect(placement.y).toBeLessThan(400 + PANEL.height);
  });

  it("goes the other way when a bright Atom is sitting where it would land", () => {
    // Fill the whole right-hand side, so no eastern placement is clear.
    const eastSide = [200, 400, 600].flatMap((y) =>
      [500, 700, 900].map((x) => occluderAt(x, y)),
    );

    const placement = placePanel({
      anchor: { x: 400, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: eastSide,
    });

    expect(placement.x + PANEL.width).toBeLessThanOrEqual(460);
  });

  it("stands as close to its Atom as the space allows", () => {
    const placement = placePanel({
      anchor: { x: 400, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [],
    });

    // With everything clear it has no reason to stand off; the near ring
    // leaves a 26px gap, and anything much beyond that reads as detached.
    const gap = Math.min(
      Math.abs(placement.x - 400),
      Math.abs(placement.x + PANEL.width - 400),
    );
    expect(gap).toBeLessThanOrEqual(40);
  });

  it("keeps the whole panel on screen for an Atom against the edge", () => {
    for (const anchor of [
      { x: 4, y: 4 },
      { x: 1196, y: 796 },
      { x: 1196, y: 4 },
      { x: 4, y: 796 },
    ]) {
      const placement = placePanel({
        anchor,
        panel: PANEL,
        viewport: VIEWPORT,
        occluders: [],
      });

      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeGreaterThanOrEqual(0);
      expect(placement.x + PANEL.width).toBeLessThanOrEqual(VIEWPORT.width);
      expect(placement.y + PANEL.height).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  it("stays where it is while its current spot is still about as good", () => {
    const settled = placePanel({
      anchor: { x: 600, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [],
    });

    // One faint Atom drifts in far enough away to shade the score, but not
    // enough to be worth the panel jumping across the Sphere.
    const nudged = placePanel({
      anchor: { x: 600, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [{ id: "atom-drifter", x: 700, y: 260, radius: 8, weight: 0 }],
      current: settled.key,
    });

    expect(nudged.key).toBe(settled.key);
  });

  it("does move when its current spot becomes genuinely bad", () => {
    const settled = placePanel({
      anchor: { x: 600, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [],
    });

    const blocked = placePanel({
      anchor: { x: 600, y: 400 },
      panel: PANEL,
      viewport: VIEWPORT,
      occluders: [700, 800, 900].flatMap((x) =>
        [300, 400, 500].map((y) => occluderAt(x, y)),
      ),
      current: settled.key,
    });

    expect(blocked.key).not.toBe(settled.key);
  });
});

import { describe, expect, it } from "vitest";

import { fitDistance } from "./camera-framing";

/** The scene's own camera: 50° vertical field. */
const FOV = (50 * Math.PI) / 180;

/** Half-extent of the widest orbit, plus the margin the scene leaves. */
const EXTENT = 1.15;

/**
 * Where the Sphere's silhouette lands, as a fraction of the half-viewport.
 * At or below 1 the whole Sphere is on screen.
 */
function edgeFraction(
  distance: number,
  viewport: { width: number; height: number },
) {
  const verticalHalf = Math.tan(FOV / 2) * distance;
  const horizontalHalf = verticalHalf * (viewport.width / viewport.height);
  return {
    vertical: EXTENT / verticalHalf,
    horizontal: EXTENT / horizontalHalf,
  };
}

describe("fitDistance", () => {
  it("fits the whole Sphere on a landscape desktop", () => {
    const viewport = { width: 1440, height: 900 };

    const edge = edgeFraction(fitDistance(viewport, FOV, EXTENT), viewport);

    expect(edge.vertical).toBeLessThanOrEqual(1);
    expect(edge.horizontal).toBeLessThanOrEqual(1);
  });

  it("fits it sideways too on a portrait phone", () => {
    const viewport = { width: 390, height: 844 };

    const edge = edgeFraction(fitDistance(viewport, FOV, EXTENT), viewport);

    expect(edge.horizontal).toBeLessThanOrEqual(1);
    expect(edge.vertical).toBeLessThanOrEqual(1);
  });

  it("pulls further back the taller than wide the viewport gets", () => {
    // Square is the turning point: at or above it, height governs and the
    // distance stops changing. Below it, every step narrower costs reach.
    const square = fitDistance({ width: 900, height: 900 }, FOV, EXTENT);
    const tablet = fitDistance({ width: 675, height: 900 }, FOV, EXTENT);
    const phone = fitDistance({ width: 390, height: 844 }, FOV, EXTENT);

    expect(tablet).toBeGreaterThan(square);
    expect(phone).toBeGreaterThan(tablet);
  });

  it("never frames a landscape viewport further back than height demands", () => {
    // Widening past square must not keep pushing the camera away, or the
    // Sphere would shrink into the middle of a big desktop window.
    const wide = fitDistance({ width: 1440, height: 900 }, FOV, EXTENT);
    const wider = fitDistance({ width: 2560, height: 900 }, FOV, EXTENT);

    expect(wider).toBeCloseTo(wide, 6);
  });
});

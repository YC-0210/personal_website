import { describe, expect, it } from "vitest";

import {
  DEFAULT_ORBIT_TUNING,
  isTuningRequested,
  ORBIT_TUNING_RANGES,
  tuningFromSearch,
} from "./orbit-tuning";

describe("Asking for the tuning panel", () => {
  it("opens it only when the URL says so", () => {
    expect(isTuningRequested("?tune=1")).toBe(true);
    expect(isTuningRequested("")).toBe(false);
    expect(isTuningRequested("?atom=physics")).toBe(false);
  });
});

describe("Reading a tuned setting back out of a URL", () => {
  it("takes the values the URL carries, so a shared link reproduces the feel", () => {
    expect(
      tuningFromSearch(
        "?tune=1&rotateSpeed=0.25&zoomSpeed=0.4&dampingFactor=0.12&autoRotateSpeed=0.2",
      ),
    ).toEqual({
      rotateSpeed: 0.25,
      zoomSpeed: 0.4,
      dampingFactor: 0.12,
      autoRotateSpeed: 0.2,
    });
  });

  it("leaves anything the URL does not mention at today's value", () => {
    expect(tuningFromSearch("?tune=1&rotateSpeed=0.25")).toEqual({
      ...DEFAULT_ORBIT_TUNING,
      rotateSpeed: 0.25,
    });
  });

  it("clamps a value past the slider's range instead of honouring it", () => {
    // The URL is hand-editable, and rotateSpeed 500 makes the Sphere
    // untouchable — the panel could not undo it, because dragging the slider
    // would need the scene to still be usable.
    const tuning = tuningFromSearch("?rotateSpeed=500&dampingFactor=-3");
    expect(tuning.rotateSpeed).toBe(ORBIT_TUNING_RANGES.rotateSpeed.max);
    expect(tuning.dampingFactor).toBe(ORBIT_TUNING_RANGES.dampingFactor.min);
  });

  it("ignores a value that is not a number at all", () => {
    expect(tuningFromSearch("?rotateSpeed=fast&zoomSpeed=")).toEqual(
      DEFAULT_ORBIT_TUNING,
    );
  });
});

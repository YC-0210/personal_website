/**
 * TEMPORARY — the orbit tuning panel.
 *
 * The idle drift, the drag and the wheel all had their speeds picked by eye
 * during the ADR-0004 rounds, and the Owner reports the Sphere moves too fast.
 * Rather than guess a new number, `/?tune=1` opens a panel of sliders over the
 * scene and writes every value straight into the URL, so the settings that felt
 * right can be pasted back verbatim and become the new constants.
 *
 * Once the numbers are chosen this module, its panel and its `?tune` gate all
 * come out, and `DEFAULT_ORBIT_TUNING` becomes plain constants in the scene.
 */

/** Every knob the panel offers, in the units OrbitControls already uses. */
export interface OrbitTuning {
  /** Drag-to-orbit rate. */
  rotateSpeed: number;
  /** Wheel/pinch dolly rate. */
  zoomSpeed: number;
  /** How quickly a throw comes to rest. Higher stops sooner. */
  dampingFactor: number;
  /** Degrees per second of idle drift. */
  autoRotateSpeed: number;
}

/** Today's values — what the scene ships with, and where the panel starts. */
export const DEFAULT_ORBIT_TUNING: OrbitTuning = {
  rotateSpeed: 0.6,
  zoomSpeed: 1,
  dampingFactor: 0.08,
  autoRotateSpeed: 0.35,
};

/** The slider bounds, which are also the clamp — a URL cannot exceed them. */
export const ORBIT_TUNING_RANGES: Record<
  keyof OrbitTuning,
  { min: number; max: number; step: number; label: string }
> = {
  rotateSpeed: { min: 0.05, max: 2, step: 0.05, label: "Drag to orbit" },
  zoomSpeed: { min: 0.1, max: 2, step: 0.05, label: "Wheel to zoom" },
  dampingFactor: { min: 0.01, max: 0.3, step: 0.01, label: "Glide (lower drifts further)" },
  autoRotateSpeed: { min: 0.05, max: 3, step: 0.05, label: "Idle drift" },
};

/** Whether the URL is asking for the panel. Absent means no panel, always. */
export function isTuningRequested(search: string): boolean {
  return new URLSearchParams(search).has("tune");
}

/**
 * The tuning a URL describes, with anything it does not mention left at today's
 * value. This is what makes a tuned setting shareable: the panel writes every
 * slider into the query string, so the link *is* the answer.
 */
export function tuningFromSearch(search: string): OrbitTuning {
  const params = new URLSearchParams(search);
  const tuning = { ...DEFAULT_ORBIT_TUNING };

  for (const key of Object.keys(tuning) as (keyof OrbitTuning)[]) {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") continue;

    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    // Clamped to the slider's own range. A hand-typed `rotateSpeed=500` would
    // otherwise make the Sphere impossible to drag — and impossible to tune
    // back down, since fixing it means dragging a slider on that same scene.
    const { min, max } = ORBIT_TUNING_RANGES[key];
    tuning[key] = Math.min(max, Math.max(min, value));
  }

  return tuning;
}

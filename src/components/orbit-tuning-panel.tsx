"use client";

import {
  ORBIT_TUNING_RANGES,
  type OrbitTuning,
} from "@/sphere/orbit-tuning";

/**
 * TEMPORARY — the orbit tuning panel, reached at `/?tune=1`.
 *
 * Four sliders over the live scene, so the Sphere can be dragged and spun while
 * the numbers move. Every change is written into the URL, which means the
 * setting that felt right can be copied out of the address bar and pasted back
 * rather than described.
 *
 * Deliberately plain: this is a measuring instrument, not part of the site, and
 * it comes out with `orbit-tuning.ts` once the numbers are chosen.
 */
export function OrbitTuningPanel({
  tuning,
  onChange,
  onReset,
}: {
  tuning: OrbitTuning;
  onChange: (next: OrbitTuning) => void;
  onReset: () => void;
}) {
  const keys = Object.keys(ORBIT_TUNING_RANGES) as (keyof OrbitTuning)[];

  return (
    <section
      aria-label="Orbit tuning"
      className="border-hairline bg-surface-1/95 fixed top-16 left-4 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-lg border p-4 backdrop-blur"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
          ORBIT TUNING
        </p>
        <button
          type="button"
          onClick={onReset}
          className="text-ink-subtle hover:text-ink text-xs font-medium"
        >
          Reset
        </button>
      </div>
      <p className="text-ink-subtle mt-1 text-xs leading-relaxed">
        Temporary. Drag the Sphere while you move these, then send back the URL.
      </p>

      {keys.map((key) => {
        const { min, max, step, label } = ORBIT_TUNING_RANGES[key];
        return (
          <label key={key} className="mt-3 block">
            <span className="text-ink-muted flex items-baseline justify-between text-xs">
              {label}
              <span className="text-ink tabular-nums">
                {tuning[key].toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={tuning[key]}
              onChange={(event) =>
                onChange({ ...tuning, [key]: Number(event.target.value) })
              }
              className="accent-primary mt-1 w-full"
            />
          </label>
        );
      })}

      <p className="text-ink-tertiary mt-3 text-[11px] leading-relaxed break-all">
        Lower is slower. The URL updates as you drag — copy it from the address
        bar when it feels right.
      </p>
    </section>
  );
}

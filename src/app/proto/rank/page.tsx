"use client";

/**
 * ADR-0004 prototypes for issue #24 — throwaway. Removed before merge.
 *
 * Three candidate Rank curves plus today's linear one as a baseline,
 * switchable via `?variant=` on this one route. Each drives *both* size and
 * orbit depth from the one number, as ADR-0003 requires.
 *
 * The bug being judged only really bites when one Atom towers over the rest, so
 * the "add a 10,000-hour outlier" toggle is part of the prototype: flip it on
 * the baseline and watch the whole Sphere collapse into the outer shell.
 */

import { useMemo, useState } from "react";

import { layoutSphere } from "@/sphere/layout";

import { PROTO_ATOMS, PROTO_CONNECTIONS } from "../proto-data";
import {
  LINEAR_CURVE,
  ProtoSphere,
  useProtoSelection,
  type RankCurve,
} from "../proto-sphere";
import { ProtoSwitcher, useVariant, type ProtoVariant } from "../proto-switcher";

/** A · Log. Every doubling of hours buys the same step, so an outlier can't flatten the rest. */
const LOG_CURVE: RankCurve = (hours, allHours) => {
  const most = Math.max(0, ...allHours);
  return most === 0 ? 0 : Math.log1p(hours) / Math.log1p(most);
};

/** B · Sqrt. Gentler than log: the top of the range keeps more of its spread. */
const SQRT_CURVE: RankCurve = (hours, allHours) => {
  const most = Math.max(0, ...allHours);
  return most === 0 ? 0 : Math.sqrt(hours / most);
};

/**
 * C · Percentile. Hours decide the *order* only; the gaps are even. The Sphere
 * always uses its full size and depth range, whatever the hour distribution is.
 */
const PERCENTILE_CURVE: RankCurve = (hours, allHours) => {
  const distinct = [...new Set(allHours)].sort((a, b) => a - b);
  if (distinct.length <= 1) return distinct.length === 1 ? 1 : 0;
  return distinct.indexOf(hours) / (distinct.length - 1);
};

const CURVES: Record<string, RankCurve> = {
  "0": LINEAR_CURVE,
  A: LOG_CURVE,
  B: SQRT_CURVE,
  C: PERCENTILE_CURVE,
};

const VARIANTS: ProtoVariant[] = [
  {
    key: "0",
    name: "Baseline · Linear (today)",
    note: "hours ÷ most hours. What ships now — here for contrast, not to pick.",
  },
  {
    key: "A",
    name: "A · Log",
    note: "log(1+h) ÷ log(1+max). Each doubling of hours is one equal step.",
  },
  {
    key: "B",
    name: "B · Sqrt",
    note: "√(h ÷ max). Lifts the bottom but keeps more spread at the top.",
  },
  {
    key: "C",
    name: "C · Percentile",
    note: "Position in the order. Even gaps, whatever the hours actually are.",
  },
];

/** The failure case from the issue: one Atom towering over everything else. */
const OUTLIER = {
  id: "outlier",
  label: "The 10,000-hour thing",
  description: "A deliberate outlier, to show what it does to everything else.",
  hoursSpent: 10_000,
};

function CurvePlot({ curve }: { curve: RankCurve }) {
  const width = 240;
  const height = 84;
  const maxHours = 1200;

  const path = (fn: RankCurve) =>
    Array.from({ length: 61 }, (_, step) => {
      const hours = (step / 60) * maxHours;
      const x = (step / 60) * width;
      const y = height - fn(hours, [maxHours]) * height;
      return `${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="border-hairline mt-3 w-full rounded-md border"
      role="img"
      aria-label="Rank against hours, with today's linear curve behind it"
    >
      <path d={path(LINEAR_CURVE)} fill="none" stroke="#62666d" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path(curve)} fill="none" stroke="#828fff" strokeWidth={1.75} />
    </svg>
  );
}

export default function RankPrototypes() {
  const variant = useVariant(VARIANTS);
  const selection = useProtoSelection();
  const [withOutlier, setWithOutlier] = useState(false);

  const atoms = useMemo(
    () => (withOutlier ? [...PROTO_ATOMS, OUTLIER] : PROTO_ATOMS),
    [withOutlier],
  );

  const curve = CURVES[variant.key];

  const ranks = useMemo(() => {
    const allHours = atoms.map((atom) => atom.hoursSpent);
    const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
    return Object.fromEntries(
      atoms.map((atom) => {
        const rank = curve(atom.hoursSpent, allHours);
        return [
          atom.id,
          {
            rank,
            size: lerp(0.02, 0.075, rank),
            orbitRadius: lerp(1, 0.55, rank),
          },
        ];
      }),
    );
  }, [atoms, curve]);

  const layout = useMemo(
    () => layoutSphere(atoms, PROTO_CONNECTIONS, ranks),
    [atoms, ranks],
  );

  /**
   * The pair issue #24 names: the Atom nearest 10% of the maximum hours and the
   * one nearest 50%. This is the number the acceptance criteria will be written
   * against, so the prototype shows it rather than leaving it to be eyeballed.
   */
  const spread = useMemo(() => {
    const most = Math.max(...atoms.map((atom) => atom.hoursSpent));
    const nearest = (fraction: number) =>
      atoms.reduce((best, atom) =>
        Math.abs(atom.hoursSpent - most * fraction) <
        Math.abs(best.hoursSpent - most * fraction)
          ? atom
          : best,
      );
    return { low: nearest(0.1), mid: nearest(0.5) };
  }, [atoms]);

  const gap = (a: string, b: string, key: "size" | "orbitRadius") =>
    Math.abs(ranks[a][key] - ranks[b][key]);

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoSphere
        atoms={atoms}
        connections={PROTO_CONNECTIONS}
        layout={layout}
        selection={selection}
      />

      <aside className="border-hairline bg-surface-1/92 fixed top-4 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-lg border p-4 backdrop-blur max-md:top-3 max-md:left-3">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px] uppercase">
          Rank curve
        </p>
        <p className="text-ink mt-1 text-[17px] font-medium tracking-[-0.01em]">
          {variant.name}
        </p>
        <p className="text-ink-subtle mt-1 text-xs leading-relaxed">
          {variant.note}
        </p>

        <CurvePlot curve={curve} />

        <label className="text-ink-muted mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={withOutlier}
            onChange={(event) => setWithOutlier(event.target.checked)}
          />
          Add a 10,000-hour outlier
        </label>

        <dl className="border-hairline text-ink-subtle mt-3 space-y-1 border-t pt-3 text-xs">
          <p className="text-ink-tertiary">
            10% vs 50% of the maximum — the pair issue #24 names:
          </p>
          <div className="flex justify-between gap-2">
            <dt className="truncate">
              {spread.low.label} vs {spread.mid.label}
            </dt>
            <dd className="text-ink tabular-nums">
              {spread.low.hoursSpent}h / {spread.mid.hoursSpent}h
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Size apart</dt>
            <dd className="text-ink tabular-nums">
              {gap(spread.low.id, spread.mid.id, "size").toFixed(4)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Orbit apart</dt>
            <dd className="text-ink tabular-nums">
              {gap(spread.low.id, spread.mid.id, "orbitRadius").toFixed(4)}
            </dd>
          </div>
        </dl>

        <ul className="border-hairline mt-3 max-h-48 space-y-0.5 overflow-y-auto border-t pt-3 text-[11px]">
          {[...atoms]
            .sort((a, b) => b.hoursSpent - a.hoursSpent)
            .map((atom) => (
              <li key={atom.id} className="flex items-center gap-2">
                <span className="text-ink-subtle w-28 truncate">{atom.label}</span>
                <span className="text-ink-tertiary w-12 text-right tabular-nums">
                  {atom.hoursSpent}h
                </span>
                <span className="bg-surface-3 h-1 flex-1 overflow-hidden rounded-full">
                  <span
                    className="bg-primary-hover block h-full"
                    style={{ width: `${ranks[atom.id].rank * 100}%` }}
                  />
                </span>
              </li>
            ))}
        </ul>
      </aside>

      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

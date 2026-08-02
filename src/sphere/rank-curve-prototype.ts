/**
 * PROTOTYPE ONLY (issue #24) — three curve shapes for the ratio -> Rank
 * mapping in `rank.ts`. See the /prototype skill; drop this file and
 * `prototypeRankCurve`/`setPrototypeRankCurve`/`SphereStore.refreshLayout`
 * once the Owner picks a direction.
 */
export interface PrototypeVariant {
  key: string;
  name: string;
}

export const RANK_CURVE_VARIANTS: PrototypeVariant[] = [
  { key: "A", name: "Linear (current)" },
  { key: "B", name: "Logarithmic" },
  { key: "C", name: "Stepped, 5 tiers" },
];

const CURVES: Record<string, (ratio: number) => number> = {
  /** Today's behaviour — the control. */
  A: (ratio) => ratio,
  /** Expands the low/mid range, compresses the top — same-ratio hour gaps (100->1000 is 10x, same as 1000->10000) read as roughly equal visual weight. */
  B: (ratio) => Math.log1p(ratio * 9) / Math.log1p(9),
  /** Discrete tiers instead of a continuous gradient — an Atom's size reads as "which bracket", not "how far along a gradient". */
  C: (ratio) => Math.ceil(ratio * 5) / 5,
};

export function curveFor(key: string): (ratio: number) => number {
  return CURVES[key] ?? CURVES.A;
}

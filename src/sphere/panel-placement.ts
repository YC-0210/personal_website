import type { AtomId } from "./domain";

/**
 * Where the heads-up detail column should sit on screen.
 *
 * The chosen direction sets the detail beside the Atom rather than in a panel,
 * so the column has to find a patch of the Sphere it can stand on without
 * covering anything. This is that search: pure screen-space geometry, fed the
 * projected Atoms by the renderer and giving back a position for the overlay.
 */

export interface ScreenAtom {
  id: AtomId;
  x: number;
  y: number;
  /** Drawn radius including glow — how much room the Atom actually takes. */
  radius: number;
  /** 0 when fully dimmed, 1 at full weight. Bright Atoms cost more to cover. */
  weight: number;
}

export interface Placement {
  /** Stable name of the chosen candidate, so the caller can hold it steady. */
  key: string;
  x: number;
  y: number;
}

export interface PlacePanelOptions {
  anchor: { x: number; y: number };
  panel: { width: number; height: number };
  viewport: { width: number; height: number };
  occluders: ScreenAtom[];
  /**
   * The placement currently in use, if any. Re-picking the outright best on
   * every frame makes the column twitch between near-equal sides as the
   * Sphere turns, so the incumbent keeps its spot until something clearly
   * better comes along.
   */
  current?: string | null;
}

/**
 * How much better a rival has to be before the column moves. Comfortably more
 * than one fully-dimmed Atom is worth, and comfortably less than one lit one.
 */
const SWITCH_MARGIN = 30;

const EDGE_PADDING = 14;

/** Eight directions at three removes. Distance is cheap; covering an Atom is not. */
const RINGS = [
  { tag: "near", gap: 26 },
  { tag: "mid", gap: 96 },
  { tag: "far", gap: 178 },
] as const;

const DIRECTIONS = [
  { tag: "e", x: 1, y: 0 },
  { tag: "w", x: -1, y: 0 },
  { tag: "n", x: 0, y: -1 },
  { tag: "s", x: 0, y: 1 },
  { tag: "ne", x: 0.72, y: -0.72 },
  { tag: "nw", x: -0.72, y: -0.72 },
  { tag: "se", x: 0.72, y: 0.72 },
  { tag: "sw", x: -0.72, y: 0.72 },
] as const;

interface Candidate extends Placement {
  reach: number;
}

function candidatesFor(options: PlacePanelOptions): Candidate[] {
  const { anchor, panel, viewport } = options;
  const candidates: Candidate[] = [];

  for (const ring of RINGS) {
    for (const direction of DIRECTIONS) {
      const centreX = anchor.x + direction.x * (ring.gap + panel.width / 2);
      const centreY = anchor.y + direction.y * (ring.gap + panel.height / 2);
      candidates.push({
        key: `${direction.tag}-${ring.tag}`,
        x: clamp(
          centreX - panel.width / 2,
          EDGE_PADDING,
          viewport.width - panel.width - EDGE_PADDING,
        ),
        y: clamp(
          centreY - panel.height / 2,
          EDGE_PADDING,
          viewport.height - panel.height - EDGE_PADDING,
        ),
        reach: ring.gap,
      });
    }
  }

  return candidates;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(Math.max(low, high), value));
}

/**
 * What a placement would cost. Legibility is destroyed by a single bright
 * point rather than by total covered area, so every Atom whose disc lands
 * under the panel is a flat penalty scaled by its weight — not by its size.
 */
function costOf(
  candidate: Candidate,
  options: PlacePanelOptions,
): number {
  const { panel } = options;
  const left = candidate.x - 10;
  const top = candidate.y - 12;
  const right = candidate.x + panel.width + 10;
  const bottom = candidate.y + panel.height + 12;

  let cost = 0;
  for (const atom of options.occluders) {
    const dx = Math.max(left - atom.x, 0, atom.x - right);
    const dy = Math.max(top - atom.y, 0, atom.y - bottom);
    const distance = Math.hypot(dx, dy);
    if (distance >= atom.radius) continue;
    cost += 100 * (0.2 + atom.weight) * (1 - distance / atom.radius);
  }

  // All else equal, stay near the Atom the detail belongs to.
  return cost + candidate.reach * 0.05;
}

export function placePanel(options: PlacePanelOptions): Placement {
  const scored = candidatesFor(options).map((candidate) => ({
    candidate,
    cost: costOf(candidate, options),
  }));

  const best = scored.reduce((lowest, entry) =>
    entry.cost < lowest.cost ? entry : lowest,
  );

  const incumbent = scored.find(
    (entry) => entry.candidate.key === options.current,
  );
  const chosen =
    incumbent && incumbent.cost <= best.cost + SWITCH_MARGIN ? incumbent : best;

  return {
    key: chosen.candidate.key,
    x: chosen.candidate.x,
    y: chosen.candidate.y,
  };
}

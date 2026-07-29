import type { Atom, AtomId, Connection } from "./domain";
import type { AtomRank } from "./rank";

export type Vec3 = readonly [number, number, number];

export interface AtomLayout extends AtomRank {
  /** Where the Atom sits in the Sphere, at `orbitRadius` from the centre. */
  position: Vec3;
}

/**
 * Angular positions come from a force-directed relaxation on the unit sphere:
 * every Atom pushes every other away, and each Connection pulls its two
 * endpoints together in proportion to its strength. Radius is Rank's job, so
 * the directions are re-normalised after every step and only the angles move.
 *
 * The seed is a Fibonacci sphere rather than anything random, and the
 * relaxation is a fixed number of steps, so the same data always lays out the
 * same way — the Owner never sees the Sphere reshuffle for no reason.
 */
const ITERATIONS = 240;
const REPULSION = 0.35;
const ATTRACTION = 0.9;
const INITIAL_STEP = 0.08;
/** Keeps coincident Atoms from producing an infinite repulsion. */
const EPSILON = 1e-6;

/** Evenly-spaced points on a unit sphere, in a fixed order. */
function fibonacciSphere(count: number): number[][] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    return [Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius];
  });
}

function normalise(v: number[]): number[] {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length < EPSILON) return [0, 1, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function layoutSphere(
  atoms: Atom[],
  connections: Connection[],
  ranks: Record<AtomId, AtomRank>,
): Record<AtomId, AtomLayout> {
  // Sort by id so the seed order depends on the data, not on the order rows
  // happened to come back from the repository.
  const ordered = [...atoms].sort((a, b) => (a.id < b.id ? -1 : 1));
  const indexOf = new Map(ordered.map((atom, i) => [atom.id, i]));
  const directions = fibonacciSphere(ordered.length);

  const links = connections
    .map((connection) => ({
      a: indexOf.get(connection.fromAtomId),
      b: indexOf.get(connection.toAtomId),
      strength: connection.strength,
    }))
    .filter(
      (link): link is { a: number; b: number; strength: number } =>
        link.a !== undefined && link.b !== undefined,
    );

  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    // Cool down as we go, so early steps explore and later ones settle.
    const step = INITIAL_STEP * (1 - iteration / ITERATIONS);
    const forces = directions.map(() => [0, 0, 0]);

    for (let i = 0; i < directions.length; i++) {
      for (let j = i + 1; j < directions.length; j++) {
        const dx = directions[i][0] - directions[j][0];
        const dy = directions[i][1] - directions[j][1];
        const dz = directions[i][2] - directions[j][2];
        const distance = Math.max(Math.hypot(dx, dy, dz), EPSILON);
        const push = REPULSION / (distance * distance);

        forces[i][0] += (dx / distance) * push;
        forces[i][1] += (dy / distance) * push;
        forces[i][2] += (dz / distance) * push;
        forces[j][0] -= (dx / distance) * push;
        forces[j][1] -= (dy / distance) * push;
        forces[j][2] -= (dz / distance) * push;
      }
    }

    for (const { a, b, strength } of links) {
      const dx = directions[b][0] - directions[a][0];
      const dy = directions[b][1] - directions[a][1];
      const dz = directions[b][2] - directions[a][2];
      const pull = ATTRACTION * strength;

      forces[a][0] += dx * pull;
      forces[a][1] += dy * pull;
      forces[a][2] += dz * pull;
      forces[b][0] -= dx * pull;
      forces[b][1] -= dy * pull;
      forces[b][2] -= dz * pull;
    }

    for (let i = 0; i < directions.length; i++) {
      directions[i] = normalise([
        directions[i][0] + forces[i][0] * step,
        directions[i][1] + forces[i][1] * step,
        directions[i][2] + forces[i][2] * step,
      ]);
    }
  }

  const layout: Record<AtomId, AtomLayout> = {};
  for (const atom of ordered) {
    const rank = ranks[atom.id];
    const direction = directions[indexOf.get(atom.id)!];
    layout[atom.id] = {
      ...rank,
      position: [
        direction[0] * rank.orbitRadius,
        direction[1] * rank.orbitRadius,
        direction[2] * rank.orbitRadius,
      ],
    };
  }
  return layout;
}

"use client";

/**
 * ADR-0004 prototype scaffolding — throwaway. Removed before merge.
 *
 * A stripped-down Sphere the prototypes can orbit: the same Lattice Atom,
 * Connections and Nameplates the real scene draws, over the in-memory fixture
 * and with a swappable Rank curve. It runs the real `layoutSphere`, so what the
 * Owner orbits here is what the production layout would produce.
 *
 * No store, no Supabase, no writes — a prototype answers "what should this look
 * like", and persistence is not part of that question.
 */

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";

import type { Atom, AtomId, Connection } from "@/sphere/domain";
import { layoutSphere, type AtomLayout } from "@/sphere/layout";
import type { AtomRank } from "@/sphere/rank";

import { PROTO_ATOMS, PROTO_CONNECTIONS } from "./proto-data";

const ATOM_COLOR = "#f7f8f8";
const SELECTED_COLOR = "#828fff";
const DIM_COLOR = "#8a8f98";
const SHELL_COLOR = "#34343a";
const CONNECTION_COLOR = new THREE.Color("#5e6ad2");

/** A curve under test: hours in, 0–1 Rank out. The whole of issue #24. */
export type RankCurve = (hoursSpent: number, allHours: number[]) => number;

const MIN_SIZE = 0.02;
const MAX_SIZE = 0.075;
const MIN_ORBIT_RADIUS = 0.55;
const MAX_ORBIT_RADIUS = 1;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** The production size/orbit mapping, over whatever curve is being tried. */
export function rankWithCurve(curve: RankCurve): Record<AtomId, AtomRank> {
  const allHours = PROTO_ATOMS.map((atom) => atom.hoursSpent);

  const ranked: Record<AtomId, AtomRank> = {};
  for (const atom of PROTO_ATOMS) {
    const rank = curve(atom.hoursSpent, allHours);
    ranked[atom.id] = {
      rank,
      size: lerp(MIN_SIZE, MAX_SIZE, rank),
      orbitRadius: lerp(MAX_ORBIT_RADIUS, MIN_ORBIT_RADIUS, rank),
    };
  }
  return ranked;
}

/** The curve the Sphere used before issue #24 — kept for the round-one page. */
export const LINEAR_CURVE: RankCurve = (hours, allHours) => {
  const most = Math.max(0, ...allHours);
  return most === 0 ? 0 : hours / most;
};

/** A · Log, the curve the Owner picked and the one that now ships. */
export const LOG_CURVE: RankCurve = (hours, allHours) => {
  const most = Math.max(0, ...allHours);
  return most === 0 ? 0 : Math.log1p(hours) / Math.log1p(most);
};

export function useProtoLayout(curve: RankCurve): Record<AtomId, AtomLayout> {
  return useMemo(
    () => layoutSphere(PROTO_ATOMS, PROTO_CONNECTIONS, rankWithCurve(curve)),
    [curve],
  );
}

export interface ProtoSelection {
  selectedAtomId: AtomId | null;
  select: (atomId: AtomId | null) => void;
}

export function useProtoSelection(): ProtoSelection {
  const [selectedAtomId, setSelectedAtomId] = useState<AtomId | null>(null);
  return { selectedAtomId, select: setSelectedAtomId };
}

/** Dim everything the selection doesn't touch, exactly as `emphasis` does. */
function neighboursOf(
  connections: Connection[],
  atomId: AtomId | null,
): Set<AtomId> {
  const near = new Set<AtomId>();
  if (atomId === null) return near;
  near.add(atomId);
  for (const connection of connections) {
    if (connection.fromAtomId === atomId) near.add(connection.toAtomId);
    if (connection.toAtomId === atomId) near.add(connection.fromAtomId);
  }
  return near;
}

/**
 * Anything a prototype wants to draw *around* an Atom rather than instead of
 * it — the orbit rings of issue #24's second round. Rendered in the Atom's
 * group but outside its scale, so a ring is sized in world units from Rank
 * rather than inheriting the node's size.
 */
export type AtomDecoration = (
  placement: AtomLayout,
  index: number,
  isDimmed: boolean,
) => React.ReactNode;

function AtomNodes({
  atoms,
  connections,
  layout,
  selection,
  showNameplates,
  decoration,
}: {
  atoms: Atom[];
  connections: Connection[];
  layout: Record<AtomId, AtomLayout>;
  selection: ProtoSelection;
  showNameplates: boolean;
  decoration?: AtomDecoration;
}) {
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);
  const shellGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const near = neighboursOf(connections, selection.selectedAtomId);

  return (
    <>
      {atoms.map((atom, index) => {
        const placement = layout[atom.id];
        if (!placement) return null;

        const isSelected = atom.id === selection.selectedAtomId;
        const isDimmed = selection.selectedAtomId !== null && !near.has(atom.id);
        const scale = placement.size * (isDimmed ? 0.45 : isSelected ? 1.15 : 1);

        return (
          <group key={atom.id} position={placement.position as THREE.Vector3Tuple}>
            {decoration?.(placement, index, isDimmed)}
            <group
              scale={scale}
              onClick={(event) => {
                event.stopPropagation();
                selection.select(atom.id);
              }}
            >
              <mesh geometry={coreGeometry} scale={0.5}>
                <meshBasicMaterial
                  color={
                    isSelected ? SELECTED_COLOR : isDimmed ? DIM_COLOR : ATOM_COLOR
                  }
                  transparent
                  opacity={isDimmed ? 0.3 : 1}
                />
              </mesh>
              <mesh geometry={shellGeometry}>
                <meshBasicMaterial
                  color={isSelected ? SELECTED_COLOR : SHELL_COLOR}
                  wireframe
                  transparent
                  opacity={isDimmed ? 0.12 : 0.5}
                  depthWrite={false}
                />
              </mesh>
            </group>

            {showNameplates && (
              <Html
                position={[0, -placement.size - 0.03, 0]}
                center
                distanceFactor={2.6}
                zIndexRange={[5, 0]}
                style={{ pointerEvents: "none" }}
              >
                <span
                  className="block font-medium whitespace-nowrap"
                  style={{
                    fontSize: `${9 + placement.rank * 6}px`,
                    color: isSelected
                      ? SELECTED_COLOR
                      : isDimmed
                        ? DIM_COLOR
                        : ATOM_COLOR,
                    opacity: isDimmed ? 0.25 : 0.9,
                  }}
                >
                  {atom.label}
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

function ConnectionLines({
  connections,
  layout,
  selectedAtomId,
}: {
  connections: Connection[];
  layout: Record<AtomId, AtomLayout>;
  selectedAtomId: AtomId | null;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const connection of connections) {
      const from = layout[connection.fromAtomId];
      const to = layout[connection.toAtomId];
      if (!from || !to) continue;

      const isLit =
        selectedAtomId !== null &&
        (connection.fromAtomId === selectedAtomId ||
          connection.toAtomId === selectedAtomId);
      const brightness = isLit ? 0.15 + connection.strength * 0.5 : 0.06;

      positions.push(...from.position, ...to.position);
      for (let end = 0; end < 2; end++) {
        colors.push(
          CONNECTION_COLOR.r * brightness,
          CONNECTION_COLOR.g * brightness,
          CONNECTION_COLOR.b * brightness,
        );
      }
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return buffer;
  }, [connections, layout, selectedAtomId]);

  return (
    <lineSegments frustumCulled={false} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

export function ProtoSphere({
  layout,
  selection,
  atoms = PROTO_ATOMS,
  connections = PROTO_CONNECTIONS,
  showNameplates = true,
  distance = 2.4,
  decoration,
}: {
  layout: Record<AtomId, AtomLayout>;
  selection: ProtoSelection;
  atoms?: Atom[];
  connections?: Connection[];
  showNameplates?: boolean;
  distance?: number;
  decoration?: AtomDecoration;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, distance], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={() => selection.select(null)}
    >
      <color attach="background" args={["#010102"]} />
      <ConnectionLines
        connections={connections}
        layout={layout}
        selectedAtomId={selection.selectedAtomId}
      />
      <AtomNodes
        atoms={atoms}
        connections={connections}
        layout={layout}
        selection={selection}
        showNameplates={showNameplates}
        decoration={decoration}
      />
      <OrbitControls
        autoRotate={selection.selectedAtomId === null}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={0.4}
        maxDistance={6}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}

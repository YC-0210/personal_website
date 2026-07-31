"use client";

/**
 * ADR-0004 prototype scaffolding — throwaway. Removed before merge.
 *
 * A simplified Sphere scene with always-visible Nameplates, plus the Compact
 * Bar, shared by the three mobile-Dossier prototypes at /proto/a|b|c.
 */

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import type { ConnectionDetail } from "@/sphere/store";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

const ATOM_COLOR = "#f7f8f8";
const SELECTED_COLOR = "#828fff";
const DIM_COLOR = "#8a8f98";
const SHELL_COLOR = "#34343a";
const CONNECTION_COLOR = new THREE.Color("#5e6ad2");

export function useSelectedDetail() {
  useSphere();
  return getSphereStore().selectedDetail();
}

function Nameplates() {
  const { atoms, layout, emphasis, selectedAtomId } = useSphere();

  return (
    <>
      {atoms.map((atom) => {
        const placement = layout[atom.id];
        if (!placement) return null;
        const isSelected = atom.id === selectedAtomId;
        const isDimmed = emphasis.atoms[atom.id] === "dimmed";
        return (
          <Html
            key={atom.id}
            position={[
              placement.position[0],
              placement.position[1] - placement.size - 0.03,
              placement.position[2],
            ]}
            center
            distanceFactor={2.6}
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className="block whitespace-nowrap font-medium"
              style={{
                fontSize: `${9 + placement.rank * 6}px`,
                color: isSelected ? SELECTED_COLOR : isDimmed ? DIM_COLOR : ATOM_COLOR,
                opacity: isDimmed ? 0.25 : 0.9,
              }}
            >
              {atom.label}
            </span>
          </Html>
        );
      })}
    </>
  );
}

function AtomNodes() {
  const { atoms, layout, emphasis, selectedAtomId } = useSphere();
  const store = getSphereStore();
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);
  const shellGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);

  return (
    <>
      {atoms.map((atom) => {
        const placement = layout[atom.id];
        if (!placement) return null;
        const isSelected = atom.id === selectedAtomId;
        const isDimmed = emphasis.atoms[atom.id] === "dimmed";
        const scale = placement.size * (isDimmed ? 0.45 : isSelected ? 1.15 : 1);
        return (
          <group
            key={atom.id}
            position={placement.position as unknown as THREE.Vector3Tuple}
            scale={scale}
            onClick={(event) => {
              event.stopPropagation();
              store.selectAtom(atom.id);
            }}
          >
            <mesh geometry={coreGeometry} scale={0.5}>
              <meshBasicMaterial
                color={isSelected ? SELECTED_COLOR : isDimmed ? DIM_COLOR : ATOM_COLOR}
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
        );
      })}
    </>
  );
}

function ConnectionLines() {
  const { connections, layout, emphasis } = useSphere();

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const connection of connections) {
      const from = layout[connection.fromAtomId];
      const to = layout[connection.toAtomId];
      if (!from || !to) continue;
      const brightness =
        emphasis.connections[connection.id] === "highlighted"
          ? 0.15 + connection.strength * 0.5
          : 0.05;
      positions.push(...from.position, ...to.position);
      for (let i = 0; i < 2; i++) {
        colors.push(
          CONNECTION_COLOR.r * brightness,
          CONNECTION_COLOR.g * brightness,
          CONNECTION_COLOR.b * brightness,
        );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [connections, layout, emphasis]);

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

export function ProtoScene({ children }: { children?: React.ReactNode }) {
  const { selectedAtomId } = useSphere();
  return (
    <Canvas
      camera={{ position: [0, 0, 2.4], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={() => getSphereStore().clearSelection()}
    >
      <color attach="background" args={["#010102"]} />
      <ConnectionLines />
      <AtomNodes />
      <Nameplates />
      {children}
      <OrbitControls
        autoRotate={selectedAtomId === null}
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

/** The Compact Bar: the lean form of a selection. Tap to open the Dossier. */
export function CompactBar({
  detail,
  onOpen,
  hint = "Details",
}: {
  detail: { atom: { label: string; hoursSpent: number }; connections: ConnectionDetail[] };
  onOpen: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-hairline bg-surface-1 fixed right-3 bottom-3 left-3 z-20 flex items-center gap-3 rounded-lg border px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-sm font-medium">
          {detail.atom.label}
        </span>
        <span className="text-ink-subtle text-xs">
          {detail.atom.hoursSpent.toLocaleString()} hrs ·{" "}
          {detail.connections.length} connections
        </span>
      </span>
      <span className="text-primary-hover text-xs font-medium">{hint} ↑</span>
    </button>
  );
}

/** One Connection row: leads with how the two Atoms relate. */
export function ConnectionRow({
  detail,
  onFollow,
}: {
  detail: ConnectionDetail;
  onFollow: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFollow}
      className="border-hairline flex w-full flex-col gap-1 border-t py-3 text-left"
    >
      <span className="text-ink-muted text-sm leading-relaxed">
        {detail.connection.description}
      </span>
      <span className="text-ink-subtle text-xs">
        → {detail.otherAtom.label} · Strength{" "}
        {Math.round(detail.connection.strength * 100)} of 100
      </span>
    </button>
  );
}

export function ProtoBadge({ name }: { name: string }) {
  return (
    <p className="bg-surface-2 text-ink-subtle fixed top-3 left-3 z-20 rounded-full px-2.5 py-1 text-xs">
      Prototype {name} · <a href="/proto" className="underline">back</a>
    </p>
  );
}

"use client";

/**
 * ADR-0004 prototypes for issue #24, round three — throwaway. Removed before merge.
 *
 * Round two drew the orbit *around* each Atom and the Owner rejected all three:
 * eighteen rings in one scene read as clutter, not as Rank. So this round keeps
 * the Lattice Atom exactly as it is and puts the motion inside it. Nothing here
 * can escape the Atom's silhouette, so the Sphere's layout is untouched however
 * many Atoms there are.
 *
 * All three on the log curve, which is what now ships.
 */

import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import type { AtomLayout } from "@/sphere/layout";

import {
  LOG_CURVE,
  ProtoSphere,
  useProtoLayout,
  useProtoSelection,
  type AtomInterior,
} from "../proto-sphere";
import {
  ProtoNotes,
  ProtoSwitcher,
  useVariant,
  type ProtoVariant,
} from "../proto-switcher";

const BODY_COLOR = "#828fff";

const VARIANTS: ProtoVariant[] = [
  {
    key: "A",
    name: "A · Inner moon",
    note: "A body circling between core and shell. Rank sets how wide and how fast.",
  },
  {
    key: "B",
    name: "B · Spin",
    note: "No new geometry at all. Rank is how fast the shell turns and how full the core is.",
  },
  {
    key: "C",
    name: "C · Armillary",
    note: "Counter-turning bands inside the shell. Rank is how many, and how fast.",
  },
];

/**
 * A — Inner moon. One small body orbiting inside the shell, between the core
 * and the wireframe. Rank widens its path and quickens it, so a high-Rank Atom
 * has something visibly travelling in it and a low-Rank one is nearly still.
 */
function InnerMoon({
  placement,
  index,
  isDimmed,
}: {
  placement: AtomLayout;
  index: number;
  isDimmed: boolean;
}) {
  const body = useRef<THREE.Mesh>(null);
  // Between the core (0.5) and the shell (1), never touching either.
  const radius = 0.62 + placement.rank * 0.24;
  const tilt = useMemo<[number, number, number]>(
    () => [Math.PI / 2.4 + (index % 4) * 0.2, (index % 6) * 0.5, 0],
    [index],
  );

  useFrame(({ clock }) => {
    if (!body.current) return;
    const speed = 0.4 + placement.rank * 2.2;
    const angle = clock.elapsedTime * speed + index;
    body.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0,
    );
  });

  return (
    <group rotation={tilt}>
      <mesh ref={body}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshBasicMaterial
          color={BODY_COLOR}
          transparent
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>
    </group>
  );
}

/**
 * C — Armillary. One to three bands inside the shell on different axes, turning
 * against each other. Rank decides how many and how fast, so Rank is legible
 * both as a count when still and as energy when moving.
 */
function Armillary({
  placement,
  isDimmed,
}: {
  placement: AtomLayout;
  isDimmed: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const counter = useRef<THREE.Group>(null);
  const bands = Math.max(1, Math.ceil(placement.rank * 3));
  const geometry = useMemo(
    () => new THREE.TorusGeometry(0.78, 0.022, 8, 40),
    [],
  );

  useFrame((_, delta) => {
    const speed = 0.3 + placement.rank * 1.8;
    if (group.current) group.current.rotation.y += speed * delta;
    if (counter.current) counter.current.rotation.x -= speed * delta;
  });

  const material = (
    <meshBasicMaterial
      color={BODY_COLOR}
      transparent
      opacity={isDimmed ? 0.15 : 0.8}
      depthWrite={false}
    />
  );

  return (
    <>
      <group ref={group}>
        <mesh geometry={geometry}>{material}</mesh>
      </group>
      {bands > 1 && (
        <group ref={counter} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geometry}>{material}</mesh>
        </group>
      )}
      {bands > 2 && (
        <mesh geometry={geometry} rotation={[0, 0, Math.PI / 2]}>
          {material}
        </mesh>
      )}
    </>
  );
}

const INTERIORS: Record<string, AtomInterior> = {
  A: {
    render: (placement, index, isDimmed) => (
      <InnerMoon placement={placement} index={index} isDimmed={isDimmed} />
    ),
  },
  // B adds nothing. The Atom's two existing pieces carry Rank on their own:
  // the shell's spin and how much of it the core fills.
  B: {
    coreScale: (placement) => 0.3 + placement.rank * 0.42,
    shellSpin: (placement) => 0.08 + placement.rank * 1.5,
  },
  C: {
    render: (placement, _index, isDimmed) => (
      <Armillary placement={placement} isDimmed={isDimmed} />
    ),
  },
};

export default function OrbitInsidePrototypes() {
  return (
    <Suspense fallback={null}>
      <OrbitInsideRoute />
    </Suspense>
  );
}

function OrbitInsideRoute() {
  const variant = useVariant(VARIANTS);
  const selection = useProtoSelection();
  const layout = useProtoLayout(LOG_CURVE);

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoSphere
        layout={layout}
        selection={selection}
        interior={INTERIORS[variant.key]}
      />

      <ProtoNotes eyebrow="Inside the Atom · #24" current={variant}>
        <p className="border-hairline text-ink-tertiary mt-3 border-t pt-3 text-xs leading-relaxed">
          Nothing leaves the Atom, so the Sphere reads the same at any Atom
          count. Pinch in on TypeScript, then out to Rust — the question is
          whether Rank still reads once an Atom is only a few pixels wide.
        </p>
      </ProtoNotes>

      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

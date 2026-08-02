"use client";

/**
 * ADR-0004 prototypes for issue #24, round two — throwaway. Removed before merge.
 *
 * The curve is settled (A · Log) and shipping; this round is the *other* half
 * of the Owner's note: a visible orbit drawn around each Atom, so Rank reads as
 * something you can see rather than a size you have to compare across the
 * scene. Three ways to draw it, on the same Sphere the site now lays out.
 *
 * A ring's radius comes from Rank in world units, deliberately outside the
 * Atom's own scale — otherwise it would just be the node again, bigger.
 */

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import type { AtomLayout } from "@/sphere/layout";

import {
  LOG_CURVE,
  ProtoSphere,
  useProtoLayout,
  useProtoSelection,
  type AtomDecoration,
} from "../proto-sphere";
import { ProtoSwitcher, useVariant, type ProtoVariant } from "../proto-switcher";

const RING_COLOR = "#5e6ad2";
const RING_BRIGHT = "#828fff";

const VARIANTS: ProtoVariant[] = [
  {
    key: "A",
    name: "A · Halo",
    note: "One ring facing you, always. Radius is Rank — read it like a dial.",
  },
  {
    key: "B",
    name: "B · Orbit",
    note: "A tilted ring with a body travelling it. Rank sets radius and speed.",
  },
  {
    key: "C",
    name: "C · Rings",
    note: "Rank as a count, not a measure: one ring per step, up to five.",
  },
];

/** A thin annulus. Cached per radius so eighteen Atoms don't build eighteen. */
function useRingGeometry(radius: number, thickness = 0.0025) {
  return useMemo(
    () => new THREE.RingGeometry(radius - thickness, radius + thickness, 72),
    [radius, thickness],
  );
}

function Ring({
  radius,
  opacity,
  color = RING_COLOR,
}: {
  radius: number;
  opacity: number;
  color?: string;
}) {
  const geometry = useRingGeometry(radius);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * A — Halo. One camera-facing ring per Atom. Because it never foreshortens,
 * two Atoms' Rank can be compared straight off the screen at any angle; the
 * cost is that it reads as flat signage rather than as part of the scene.
 */
const halo: AtomDecoration = (placement, _index, isDimmed) => (
  <Billboard>
    <Ring
      radius={0.045 + placement.rank * 0.075}
      opacity={isDimmed ? 0.08 : 0.45}
    />
  </Billboard>
);

/**
 * B — Orbit. A ring in the Atom's own tilted plane with a small body running
 * around it. This is the literal reading of "orbit": Rank buys both a wider
 * ring and a faster body, so a high-Rank Atom is visibly busier.
 */
function OrbitRing({
  placement,
  index,
  isDimmed,
}: {
  placement: AtomLayout;
  index: number;
  isDimmed: boolean;
}) {
  const radius = 0.05 + placement.rank * 0.08;
  const body = useRef<THREE.Mesh>(null);
  // Vary the plane per Atom so the Sphere doesn't read as a stack of hoops.
  const tilt = useMemo<[number, number, number]>(
    () => [Math.PI / 2.6 + (index % 5) * 0.16, (index % 7) * 0.4, 0],
    [index],
  );

  useFrame(({ clock }) => {
    if (!body.current) return;
    const speed = 0.35 + placement.rank * 0.9;
    const angle = clock.elapsedTime * speed + index;
    body.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0,
    );
  });

  return (
    <group rotation={tilt}>
      <Ring radius={radius} opacity={isDimmed ? 0.08 : 0.35} />
      <mesh ref={body}>
        <sphereGeometry args={[0.006 + placement.rank * 0.005, 10, 8]} />
        <meshBasicMaterial
          color={RING_BRIGHT}
          transparent
          opacity={isDimmed ? 0.15 : 0.9}
        />
      </mesh>
    </group>
  );
}

const orbit: AtomDecoration = (placement, index, isDimmed) => (
  <OrbitRing placement={placement} index={index} isDimmed={isDimmed} />
);

/**
 * C — Rings. Rank as a countable thing. Five steps, one ring each, all at the
 * same spacing: you count rather than compare, which is exact at a glance but
 * throws away everything between the steps.
 */
const RING_STEPS = 5;

const rings: AtomDecoration = (placement, _index, isDimmed) => {
  const count = Math.max(1, Math.ceil(placement.rank * RING_STEPS));
  return (
    <Billboard>
      {Array.from({ length: count }, (_, ring) => (
        <Ring
          key={ring}
          radius={0.05 + ring * 0.018}
          opacity={isDimmed ? 0.07 : 0.42}
          color={ring === count - 1 ? RING_BRIGHT : RING_COLOR}
        />
      ))}
    </Billboard>
  );
};

const DECORATIONS: Record<string, AtomDecoration> = {
  A: halo,
  B: orbit,
  C: rings,
};

export default function OrbitPrototypes() {
  return (
    <Suspense fallback={null}>
      <OrbitPrototypeRoute />
    </Suspense>
  );
}

function OrbitPrototypeRoute() {
  const variant = useVariant(VARIANTS);
  const selection = useProtoSelection();
  const layout = useProtoLayout(LOG_CURVE);

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoSphere
        layout={layout}
        selection={selection}
        decoration={DECORATIONS[variant.key]}
      />

      <aside className="border-hairline bg-surface-1/92 fixed top-4 left-4 z-10 w-64 max-w-[calc(100vw-2rem)] rounded-lg border p-4 backdrop-blur">
        <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px] uppercase">
          Orbit · issue #24
        </p>
        <p className="text-ink mt-1 text-[17px] font-medium tracking-[-0.01em]">
          {variant.name}
        </p>
        <p className="text-ink-subtle mt-1 text-xs leading-relaxed">
          {variant.note}
        </p>
        <p className="border-hairline text-ink-tertiary mt-3 border-t pt-3 text-xs leading-relaxed">
          Ranked on the log curve you picked, so this is the Sphere as it now
          ships. Zoom right in on TypeScript and out to Rust to judge whether
          the ring survives both ends.
        </p>
      </aside>

      <ProtoSwitcher variants={VARIANTS} current={variant} />
    </main>
  );
}

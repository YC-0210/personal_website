"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { useSphere } from "@/sphere/use-sphere";

/** `canvas` from DESIGN.md — the near-black the whole site sits on. */
const CANVAS_COLOR = "#010102";

/** `ink` from DESIGN.md. Atoms stay in the grayscale; lavender is for selection. */
const ATOM_COLOR = "#f7f8f8";

/** Radius the Atoms will eventually be placed on. */
const SPHERE_RADIUS = 1;

/** Degrees per second of idle drift. Slow enough to read as "alive", not "spinning". */
const AUTO_ROTATE_SPEED = 0.35;

/** How long after the visitor lets go before the idle drift resumes. */
const RESUME_IDLE_AFTER_MS = 2500;

/**
 * The Sphere itself: invisible, and empty until the Atoms ticket fills it. It
 * exists so the camera has something real to orbit and Atoms have a surface to
 * be positioned against.
 */
function SphereShell() {
  return (
    <mesh visible={false}>
      <sphereGeometry args={[SPHERE_RADIUS, 32, 32]} />
      <meshBasicMaterial />
    </mesh>
  );
}

/**
 * One node per Atom, at the size and position the store derived from Rank.
 *
 * Geometry and material are shared across every node and the nodes are scaled
 * rather than re-tessellated, so the draw cost stays flat as the Sphere grows
 * toward the ~50-Atom target.
 */
function AtomNodes() {
  const { atoms, layout } = useSphere();

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: ATOM_COLOR }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <>
      {atoms.map((atom) => {
        const placement = layout[atom.id];
        if (!placement) return null;
        return (
          <mesh
            key={atom.id}
            geometry={geometry}
            material={material}
            position={placement.position as unknown as THREE.Vector3Tuple}
            scale={placement.size}
          />
        );
      })}
    </>
  );
}

/**
 * Full-viewport Sphere scene.
 *
 * Idles in a slow auto-rotation, hands control to the visitor the moment they
 * drag or swipe, and drifts again once they have been still for a beat.
 */
export function SphereScene() {
  const [isIdle, setIsIdle] = useState(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimer.current === null) return;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
  }, []);

  const handleInteractionStart = useCallback(() => {
    clearResumeTimer();
    setIsIdle(false);
  }, [clearResumeTimer]);

  const handleInteractionEnd = useCallback(() => {
    clearResumeTimer();
    resumeTimer.current = setTimeout(
      () => setIsIdle(true),
      RESUME_IDLE_AFTER_MS,
    );
  }, [clearResumeTimer]);

  useEffect(() => clearResumeTimer, [clearResumeTimer]);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, 2.4], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[CANVAS_COLOR]} />
      <SphereShell />
      <AtomNodes />
      <OrbitControls
        autoRotate={isIdle}
        autoRotateSpeed={AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={1.6}
        maxDistance={6}
        rotateSpeed={0.6}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />
    </Canvas>
  );
}

"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";

/** `canvas` from DESIGN.md — the near-black the whole site sits on. */
const CANVAS_COLOR = "#010102";

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
      camera={{ position: [0, 0, 3.2], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[CANVAS_COLOR]} />
      <SphereShell />
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

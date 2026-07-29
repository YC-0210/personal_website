"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { fitDistance } from "@/sphere/camera-framing";
import type { AtomId, ConnectionId } from "@/sphere/domain";
import type { ScreenAtom } from "@/sphere/panel-placement";
import { publishScreenProjection } from "@/sphere/screen-projection";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/** `canvas` from DESIGN.md — the near-black the whole site sits on. */
const CANVAS_COLOR = "#010102";

/** `ink` from DESIGN.md. Atoms stay in the grayscale; lavender is for selection. */
const ATOM_COLOR = new THREE.Color("#f7f8f8");

/** `primary-hover` — the lavender accent, spent only on the selected Atom. */
const SELECTED_COLOR = new THREE.Color("#828fff");

/** `ink-subtle` — what an Atom fades to when the selection passes it by. */
const DIM_COLOR = new THREE.Color("#8a8f98");

/** `primary` for the Connection itself, `primary-hover` for its signal. */
const CONNECTION_COLOR = new THREE.Color("#5e6ad2");
const SIGNAL_COLOR = new THREE.Color("#828fff");

/** Radius the Atoms will eventually be placed on. */
const SPHERE_RADIUS = 1;

/** Vertical field of view, matching the camera below. */
const FOV = 50;

/** The Sphere's widest orbit plus a little air, for the framing calculation. */
const FRAMED_EXTENT = 1.15;

/** How close and how far the visitor may push the camera. */
const MIN_DISTANCE = 1.6;
const MAX_DISTANCE = 6;

/** How long the camera takes to travel to an Atom reached by Connection. */
const FLIGHT_MS = 900;

/**
 * World radius of a lit Connection's invisible click target. Generous enough
 * to catch a thumb, small enough not to swallow clicks meant for an Atom.
 */
const CONNECTION_HIT_RADIUS = 0.035;

/** Degrees per second of idle drift. Slow enough to read as "alive", not "spinning". */
const AUTO_ROTATE_SPEED = 0.35;

/** How long after the visitor lets go before the idle drift resumes. */
const RESUME_IDLE_AFTER_MS = 2500;

/** Per-second rate the Atom and Connection transitions converge at. */
const ATOM_EASE = 7;
const LINE_EASE = 5.5;

/** What a dimmed Atom shrinks and fades to. */
const DIM_SCALE = 0.45;
const DIM_OPACITY = 0.3;

/** The selected Atom reads a touch larger than its Rank alone would make it. */
const SELECTED_SCALE = 1.15;

/** A Connection's own brightness carries its Strength, and nothing else. */
const LINE_BASE_BRIGHTNESS = 0.1;
const LINE_STRENGTH_BRIGHTNESS = 0.2;

/**
 * How many signals a Connection runs is the far Atom's Rank — the busiest
 * lines lead to the knowledge with the most hours behind it.
 */
const MAX_SIGNALS_PER_CONNECTION = 6;

/** Half-length of a tick, unlit and at the peak of the sweep. */
const TICK_HALF_LENGTH = 0.0095;
const TICK_LIT_HALF_LENGTH = 0.022;

/** Connections crossed per second by the sweep that lights the ticks. */
const TICK_SWEEP_SPEED = 0.3;

/** How tightly the sweep falls off either side of its centre. */
const TICK_SWEEP_FALLOFF = 0.09;

/** A tick this lit also gets a spark at its centre. */
const TICK_SPARK_THRESHOLD = 0.5;

/** World size of that spark. Small enough to be a highlight, not a bead. */
const TICK_SPARK_SIZE = 0.014;

/**
 * A soft round dot to mark the tick the sweep is currently on. WebGL caps line
 * width at one pixel, so the brightest point of the sweep is a sprite — without
 * it the lit tick is just a slightly longer hairline.
 */
function createSparkTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;

  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    const gradient = context.createRadialGradient(
      half,
      half,
      0,
      half,
      half,
      half,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The Sphere itself: invisible, and only there so the camera has something real
 * to orbit and Atoms have a surface to be positioned against.
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
 * One node per Atom, at the size and position the store derived from Rank, in
 * the weight the store's emphasis asks for: the selected Atom in lavender, its
 * neighbours at full ink, and everything the selection does not reach shrunk
 * and faded back into the field.
 *
 * Geometry is shared across every node and the nodes are scaled rather than
 * re-tessellated, so the draw cost stays flat as the Sphere grows toward the
 * ~50-Atom target.
 */
function AtomNodes() {
  const { atoms, layout, emphasis, selectedAtomId } = useSphere();
  const store = getSphereStore();

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const meshes = useRef(new Map<AtomId, THREE.Mesh>());

  const setCursor = useCallback((cursor: string) => {
    document.body.style.cursor = cursor;
  }, []);
  useEffect(() => () => setCursor(""), [setCursor]);

  useFrame((_, delta) => {
    const step = 1 - Math.exp(-delta * ATOM_EASE);

    for (const atom of atoms) {
      const mesh = meshes.current.get(atom.id);
      const placement = layout[atom.id];
      if (!mesh || !placement) continue;

      const isSelected = atom.id === selectedAtomId;
      const isDimmed = emphasis.atoms[atom.id] === "dimmed";

      const targetColor = isSelected
        ? SELECTED_COLOR
        : isDimmed
          ? DIM_COLOR
          : ATOM_COLOR;
      const targetScale =
        placement.size *
        (isDimmed ? DIM_SCALE : isSelected ? SELECTED_SCALE : 1);
      const targetOpacity = isDimmed ? DIM_OPACITY : 1;

      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.lerp(targetColor, step);
      material.opacity += (targetOpacity - material.opacity) * step;
      mesh.scale.setScalar(
        mesh.scale.x + (targetScale - mesh.scale.x) * step,
      );
    }
  });

  return (
    <>
      {atoms.map((atom) => {
        const placement = layout[atom.id];
        if (!placement) return null;
        return (
          <mesh
            key={atom.id}
            geometry={geometry}
            position={placement.position as unknown as THREE.Vector3Tuple}
            scale={placement.size}
            ref={(mesh) => {
              if (mesh) meshes.current.set(atom.id, mesh);
              else meshes.current.delete(atom.id);
            }}
            onClick={(event) => {
              event.stopPropagation();
              store.selectAtom(atom.id);
            }}
            onPointerOver={() => setCursor("pointer")}
            onPointerOut={() => setCursor("")}
          >
            <meshBasicMaterial color={ATOM_COLOR} transparent />
          </mesh>
        );
      })}
    </>
  );
}

/** Both Connection layers share this: a start point, an end point, a strength. */
interface ConnectionEnds {
  id: ConnectionId;
  strength: number;
  /** The selected Atom when this Connection touches it, else the `from` end. */
  start: THREE.Vector3;
  end: THREE.Vector3;
  /** Rank of the Atom at the far end, which sets how much signal runs here. */
  farRank: number;
  isHighlighted: boolean;
}

/**
 * Resolve every Connection to a pair of points in the Sphere, oriented so that
 * a highlighted Connection always runs *outward* from the selected Atom.
 */
function useConnectionEnds(): ConnectionEnds[] {
  const { connections, layout, emphasis, selectedAtomId } = useSphere();

  return useMemo(() => {
    const ends: ConnectionEnds[] = [];

    for (const connection of connections) {
      const from = layout[connection.fromAtomId];
      const to = layout[connection.toAtomId];
      if (!from || !to) continue;

      const startsAtSelection = connection.toAtomId === selectedAtomId;
      const near = startsAtSelection ? to : from;
      const far = startsAtSelection ? from : to;

      ends.push({
        id: connection.id,
        strength: connection.strength,
        start: new THREE.Vector3(...near.position),
        end: new THREE.Vector3(...far.position),
        farRank: far.rank,
        isHighlighted: emphasis.connections[connection.id] === "highlighted",
      });
    }

    return ends;
  }, [connections, layout, emphasis, selectedAtomId]);
}

/**
 * One line per Connection, between its two Atoms.
 *
 * At rest the lines are drawn but unlit — the Sphere reads as a field of Atoms.
 * Selecting an Atom grows its Connections outward from it, at a brightness that
 * carries their Strength.
 */
function ConnectionLines() {
  const ends = useConnectionEnds();
  const progress = useRef(new Map<ConnectionId, number>());
  /**
   * The end a Connection was last drawn from. A Connection released by the
   * selection retracts the way it grew rather than flipping ends mid-fade.
   */
  const drawnFrom = useRef(new Map<ConnectionId, ConnectionEnds>());
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(ends.length * 6), 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(ends.length * 6), 3),
    );
  }, [geometry, ends.length]);

  useFrame((_, delta) => {
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    if (!position || !color) return;

    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * LINE_EASE);

    ends.forEach((connection, index) => {
      if (connection.isHighlighted) drawnFrom.current.set(connection.id, connection);
      const drawnAs = drawnFrom.current.get(connection.id) ?? connection;

      const target = connection.isHighlighted ? 1 : 0;
      const drawn =
        (progress.current.get(connection.id) ?? 0) +
        (target - (progress.current.get(connection.id) ?? 0)) * step;
      progress.current.set(connection.id, drawn);

      const head = drawnAs.start.clone().lerp(drawnAs.end, Math.min(drawn, 1));
      position.setXYZ(
        index * 2,
        drawnAs.start.x,
        drawnAs.start.y,
        drawnAs.start.z,
      );
      position.setXYZ(index * 2 + 1, head.x, head.y, head.z);

      // Additive blending: brightness is how the opacity reads, so the
      // Strength goes into the colour rather than a per-line material.
      const brightness =
        (LINE_BASE_BRIGHTNESS +
          connection.strength * LINE_STRENGTH_BRIGHTNESS) *
        drawn;
      for (const vertex of [index * 2, index * 2 + 1]) {
        color.setXYZ(
          vertex,
          CONNECTION_COLOR.r * brightness,
          CONNECTION_COLOR.g * brightness,
          CONNECTION_COLOR.b * brightness,
        );
      }
    });

    position.needsUpdate = true;
    color.needsUpdate = true;
  });

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

/**
 * The signal on the highlighted Connections: fixed ticks across the line, as
 * many as the far Atom's Rank earns it, lit in turn by a sweep running outward
 * from the selected Atom.
 *
 * The ticks stay where they are, so the count — and therefore the Rank — stays
 * readable even when nothing is moving. Each tick is two vertices in one shared
 * buffer, so the whole layer is one draw call however busy the Sphere gets.
 */
function SignalTicks() {
  const ends = useConnectionEnds();
  const elapsed = useRef(0);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const sparkGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const spark = useMemo(() => createSparkTexture(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      sparkGeometry.dispose();
      spark.dispose();
    },
    [geometry, sparkGeometry, spark],
  );

  useEffect(() => {
    const ticks = ends.length * MAX_SIGNALS_PER_CONNECTION;
    for (const [target, vertices] of [
      [geometry, ticks * 2],
      [sparkGeometry, ticks],
    ] as const) {
      target.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(vertices * 3), 3),
      );
      target.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(vertices * 3), 3),
      );
      target.setDrawRange(0, 0);
    }
  }, [geometry, sparkGeometry, ends.length]);

  useFrame((state, delta) => {
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    const sparkPosition = sparkGeometry.getAttribute("position");
    const sparkColor = sparkGeometry.getAttribute("color");
    if (!position || !color || !sparkPosition || !sparkColor) return;

    elapsed.current += delta;

    // Reduced motion parks the sweep mid-line: the ticks and their count still
    // read, they just stop being lit in sequence.
    const sweep = reducedMotion
      ? 0.5
      : (elapsed.current * TICK_SWEEP_SPEED) % 1;

    const along = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const across = new THREE.Vector3();
    const centre = new THREE.Vector3();
    let vertex = 0;
    let sparks = 0;

    for (const connection of ends) {
      if (!connection.isHighlighted) continue;

      along.subVectors(connection.end, connection.start).normalize();

      const ticks =
        1 + Math.round(connection.farRank * (MAX_SIGNALS_PER_CONNECTION - 1));
      for (let i = 0; i < ticks; i++) {
        const at = (i + 0.5) / ticks;
        centre.copy(connection.start).lerp(connection.end, at);

        // Lay the tick across the line and square to the camera, so it stays a
        // tick from wherever the visitor happens to be orbiting.
        toCamera.subVectors(state.camera.position, centre).normalize();
        across.crossVectors(along, toCamera);
        if (across.lengthSq() < 1e-8) continue;
        across.normalize();

        // Distance to the sweep, wrapping so it re-enters at the near end.
        let gap = Math.abs(at - sweep);
        gap = Math.min(gap, 1 - gap);
        const lit = Math.exp(
          -(gap * gap) / (2 * TICK_SWEEP_FALLOFF * TICK_SWEEP_FALLOFF),
        );

        const half =
          TICK_HALF_LENGTH + (TICK_LIT_HALF_LENGTH - TICK_HALF_LENGTH) * lit;
        const brightness = 0.22 + lit * 0.7;

        for (const end of [-1, 1] as const) {
          position.setXYZ(
            vertex,
            centre.x + across.x * half * end,
            centre.y + across.y * half * end,
            centre.z + across.z * half * end,
          );
          color.setXYZ(
            vertex,
            SIGNAL_COLOR.r * brightness,
            SIGNAL_COLOR.g * brightness,
            SIGNAL_COLOR.b * brightness,
          );
          vertex += 1;
        }

        if (lit > TICK_SPARK_THRESHOLD) {
          sparkPosition.setXYZ(sparks, centre.x, centre.y, centre.z);
          sparkColor.setXYZ(
            sparks,
            SIGNAL_COLOR.r * lit,
            SIGNAL_COLOR.g * lit,
            SIGNAL_COLOR.b * lit,
          );
          sparks += 1;
        }
      }
    }

    geometry.setDrawRange(0, vertex);
    sparkGeometry.setDrawRange(0, sparks);
    position.needsUpdate = true;
    color.needsUpdate = true;
    sparkPosition.needsUpdate = true;
    sparkColor.needsUpdate = true;
  });

  return (
    <>
      <lineSegments frustumCulled={false} geometry={geometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <points frustumCulled={false} geometry={sparkGeometry}>
        <pointsMaterial
          map={spark}
          size={TICK_SPARK_SIZE}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

/**
 * Publish where every Atom lands on screen, so the DOM overlay can stand its
 * detail column clear of them. Written every frame into a plain box rather
 * than React state — nothing should re-render because the Sphere turned.
 */
function ProjectionPublisher() {
  const { atoms, layout, emphasis } = useSphere();
  const projected = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame((state) => {
    const { camera, size } = state;
    const screen: ScreenAtom[] = [];

    for (const atom of atoms) {
      const placement = layout[atom.id];
      if (!placement) continue;

      projected.current.set(...placement.position);
      const distance = camera.position.distanceTo(projected.current);
      projected.current.project(camera);

      // Behind the camera; not on screen at all.
      if (projected.current.z > 1) continue;

      const isDimmed = emphasis.atoms[atom.id] === "dimmed";
      const worldRadius = placement.size * (isDimmed ? DIM_SCALE : 1);
      // Match the drawn glow, which is what actually competes with the type.
      const pixelsPerUnit =
        size.height / (2 * Math.tan((FOV * Math.PI) / 360) * distance);

      screen.push({
        id: atom.id,
        x: ((projected.current.x + 1) / 2) * size.width,
        y: ((1 - projected.current.y) / 2) * size.height,
        radius: Math.max(worldRadius * 4.5 * pixelsPerUnit, 6),
        weight: isDimmed ? 0 : 1,
      });
    }

    publishScreenProjection(screen, size.width, size.height);
  });

  return null;
}

/**
 * Invisible click targets along the lit Connections.
 *
 * A WebGL line is one pixel wide and effectively unhittable, especially with a
 * thumb, so each highlighted Connection gets a cylinder standing in for it.
 * Only the lit ones are built — the rest are not navigable anyway.
 */
function ConnectionHitTargets() {
  const ends = useConnectionEnds();
  const store = getSphereStore();

  const geometry = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, 6, 1, true),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const setCursor = useCallback((cursor: string) => {
    document.body.style.cursor = cursor;
  }, []);
  useEffect(() => () => setCursor(""), [setCursor]);

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  return (
    <>
      {ends
        .filter((connection) => connection.isHighlighted)
        .map((connection) => {
          const span = new THREE.Vector3().subVectors(
            connection.end,
            connection.start,
          );
          const length = span.length();
          if (length < 1e-4) return null;

          const midpoint = new THREE.Vector3()
            .addVectors(connection.start, connection.end)
            .multiplyScalar(0.5);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            up,
            span.clone().normalize(),
          );

          return (
            <mesh
              key={connection.id}
              geometry={geometry}
              position={midpoint}
              quaternion={quaternion}
              scale={[CONNECTION_HIT_RADIUS, length, CONNECTION_HIT_RADIUS]}
              onClick={(event) => {
                event.stopPropagation();
                store.followConnection(connection.id);
              }}
              onPointerOver={() => setCursor("pointer")}
              onPointerOut={() => setCursor("")}
            >
              {/*
                Not `visible={false}`: three.js skips invisible objects when
                raycasting, which would make these unhittable — exactly what
                they exist for. Drawn as nothing instead.
              */}
              <meshBasicMaterial
                transparent
                opacity={0}
                depthWrite={false}
                colorWrite={false}
              />
            </mesh>
          );
        })}
    </>
  );
}

/**
 * Frames the Sphere, and flies to an Atom the visitor reached by following a
 * Connection.
 *
 * The flight holds the camera's distance and swings it around the Sphere until
 * the new Atom arrives front and centre, so the detail column stays where the
 * eye already is and the world turns underneath it.
 */
function CameraDirector({
  controls,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { cameraFocusAtomId, layout } = useSphere();
  const { camera, size } = useThree();

  /** The distance we last framed to; if untouched, we may re-frame on resize. */
  const framedAt = useRef<number | null>(null);
  const flight = useRef<{
    start: number;
    from: THREE.Spherical;
    to: THREE.Spherical;
    fromTarget: THREE.Vector3;
  } | null>(null);

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const control = controls.current;
    if (!control) return;

    const offset = camera.position.clone().sub(control.target);
    const current = offset.length();
    const zoomedByHand =
      framedAt.current !== null && Math.abs(current - framedAt.current) > 1e-3;
    if (zoomedByHand) return;

    const distance = THREE.MathUtils.clamp(
      fitDistance(
        { width: size.width, height: size.height },
        (FOV * Math.PI) / 180,
        FRAMED_EXTENT,
      ),
      MIN_DISTANCE,
      MAX_DISTANCE,
    );
    camera.position.copy(
      control.target.clone().add(offset.normalize().multiplyScalar(distance)),
    );
    control.update();
    framedAt.current = distance;
  }, [controls, camera, size.width, size.height]);

  useEffect(() => {
    const control = controls.current;
    if (!control || !cameraFocusAtomId) return;
    const placement = layout[cameraFocusAtomId];
    if (!placement) return;

    const offset = camera.position.clone().sub(control.target);
    const from = new THREE.Spherical().setFromVector3(offset);

    // Stand the camera on the far side of the Atom's own direction, so the
    // Atom ends up between the camera and the Sphere's centre.
    const direction = new THREE.Vector3(...placement.position).normalize();
    const to = new THREE.Spherical().setFromVector3(
      direction.multiplyScalar(from.radius),
    );
    to.radius = from.radius;

    // Take the short way round rather than unwinding the long way.
    while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
    while (to.theta - from.theta < -Math.PI) to.theta += Math.PI * 2;

    if (reducedMotion) {
      camera.position.setFromSpherical(to);
      control.target.set(0, 0, 0);
      control.update();
      return;
    }

    flight.current = {
      start: performance.now(),
      from,
      to,
      fromTarget: control.target.clone(),
    };
  }, [controls, camera, cameraFocusAtomId, layout, reducedMotion]);

  useFrame(() => {
    const control = controls.current;
    const active = flight.current;
    if (!control || !active) return;

    const progress = Math.min(
      1,
      (performance.now() - active.start) / FLIGHT_MS,
    );
    const eased =
      progress < 0.5
        ? 4 * progress ** 3
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const step = new THREE.Spherical(
      active.from.radius,
      THREE.MathUtils.lerp(active.from.phi, active.to.phi, eased),
      THREE.MathUtils.lerp(active.from.theta, active.to.theta, eased),
    );
    control.target.copy(active.fromTarget).multiplyScalar(1 - eased);
    camera.position.setFromSpherical(step).add(control.target);
    control.update();

    if (progress >= 1) flight.current = null;
  });

  return null;
}

/**
 * Full-viewport Sphere scene.
 *
 * Idles in a slow auto-rotation, hands control to the visitor the moment they
 * drag or swipe, and drifts again once they have been still for a beat.
 * Clicking an Atom selects it; clicking past every Atom lets the selection go.
 */
export function SphereScene() {
  const [isIdle, setIsIdle] = useState(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const { selectedAtomId } = useSphere();

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
      onPointerMissed={() => getSphereStore().clearSelection()}
    >
      <color attach="background" args={[CANVAS_COLOR]} />
      <SphereShell />
      <ConnectionLines />
      <SignalTicks />
      <ConnectionHitTargets />
      <AtomNodes />
      <ProjectionPublisher />
      <CameraDirector controls={controls} />
      <OrbitControls
        ref={controls}
        // The idle drift is for the resting Sphere. Once an Atom is selected
        // the visitor is reading, and a moving world is the last thing they
        // want under the type.
        autoRotate={isIdle && selectedAtomId === null}
        autoRotateSpeed={AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        rotateSpeed={0.6}
        // One finger orbits, two pinch to zoom — the touch parity issue #9 asks
        // for, and the default that fights least with a page that never scrolls.
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />
    </Canvas>
  );
}

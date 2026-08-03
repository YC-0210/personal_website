"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { moonCount, moonOrbit } from "@/sphere/atom-moon";
import type { AtomId, ConnectionId } from "@/sphere/domain";
import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/** `canvas` from DESIGN.md — the near-black the whole site sits on. */
const CANVAS_COLOR = "#010102";

/** `ink` from DESIGN.md. Atoms stay in the grayscale; lavender is for selection. */
const ATOM_COLOR = new THREE.Color("#f7f8f8");

/** `primary-hover` — the lavender accent, spent only on the selected Atom. */
const SELECTED_COLOR = new THREE.Color("#828fff");

/** `ink-subtle` — what an Atom fades to when the selection passes it by. */
const DIM_COLOR = new THREE.Color("#8a8f98");

/** `hairline-strong` — the Lattice shell at rest. */
const SHELL_COLOR = new THREE.Color("#34343a");

/** `primary` for the Connection itself, `primary-hover` for its signal. */
const CONNECTION_COLOR = new THREE.Color("#5e6ad2");
const SIGNAL_COLOR = new THREE.Color("#828fff");

/** Radius the Atoms will eventually be placed on. */
const SPHERE_RADIUS = 1;

/**
 * The three rates the visitor's hands feel, chosen by the Owner on a temporary
 * slider panel run over the live scene rather than picked by eye.
 *
 * The wheel was the one that read as too fast — it now travels at a little
 * under half its old rate. The drag came down a touch with it; the idle drift
 * and the glide were already right and did not move.
 */

/** Degrees per second of idle drift. Slow enough to read as "alive", not "spinning". */
const AUTO_ROTATE_SPEED = 0.35;

/** Drag-to-orbit rate. */
const ROTATE_SPEED = 0.5;

/** Wheel/pinch dolly rate. Was the OrbitControls default of 1, which overshot. */
const ZOOM_SPEED = 0.45;

/** How quickly a throw comes to rest. Lower drifts further. */
const DAMPING_FACTOR = 0.08;

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

/**
 * The Lattice Atom, as chosen from the atom-depth prototypes: a solid core at
 * half the Atom's radius inside a slowly turning wireframe shell. The shell's
 * own curvature is what keeps the Atom reading as 3D at any zoom.
 */
const LATTICE_CORE_SCALE = 0.5;

/**
 * The moon: a small body orbiting inside the shell, from the third ADR-0004
 * round on issue #24. Its radius and speed come from Rank, so time spent reads
 * as motion you can watch rather than a size to compare across the scene. It is
 * bounded by the Atom by construction — see `atom-moon.ts` for why that matters.
 */
const MOON_SIZE = 0.13;
const MOON_COLOR = new THREE.Color("#828fff");
const SHELL_OPACITY = 0.5;
const SHELL_SELECTED_OPACITY = 0.85;
const SHELL_DIM_OPACITY = 0.12;
/** Radians per second of shell spin, before the per-Atom variation. */
const SHELL_SPIN_BASE = 0.12;
const SHELL_SPIN_STEP = 0.02;

/** Radius of the invisible cylinder that makes a lit Connection clickable. */
const CONNECTION_HIT_RADIUS = 0.018;

/** The camera's framing: at rest, and with an Atom selected for the panel. */
const IDLE_DISTANCE = 2.4;
const SELECTED_DISTANCE = 2.1;
/**
 * With the panel open the orbit target sits this far to the camera's right,
 * which slides the whole Sphere left on screen and out from behind the card.
 */
const PANEL_SHIFT = 0.42;
const CAMERA_EASE = 2.4;
const CAMERA_IDLE_EASE = 2.2;

/** A Connection's own brightness carries its Strength, and nothing else. */
const LINE_BASE_BRIGHTNESS = 0.1;
const LINE_STRENGTH_BRIGHTNESS = 0.2;

/**
 * How much of that brightness each emphasis spends.
 *
 * The store gives Connections three states, not two, and the difference
 * between them is the whole selection gesture: at rest the Sphere shows how
 * its Atoms relate, and selecting one lifts its own Connections *above* that
 * resting level while pushing the rest below it. Reading only "highlighted"
 * here collapsed neutral onto dimmed and left the Sphere with no visible
 * Connections at all until something was clicked.
 */
const LINE_LEVEL_HIGHLIGHTED = 1;
const LINE_LEVEL_NEUTRAL = 0.34;
const LINE_LEVEL_DIMMED = 0.09;

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
 * One Lattice node per Atom, at the size and position the store derived from
 * Rank, in the weight the store's emphasis asks for: the selected Atom in
 * lavender, its neighbours at full ink, and everything the selection does not
 * reach shrunk and faded back into the field.
 *
 * Each node is a solid core inside a wireframe shell, and every shell turns at
 * its own phase and tilt so a field of them never reads as one copied object.
 * Both geometries are shared across every node and the nodes are scaled rather
 * than re-tessellated, so the draw cost stays flat as the Sphere grows toward
 * the ~50-Atom target.
 */
function AtomNodes() {
  const { atoms, layout, emphasis, selectedAtomId } = useSphere();
  const store = getSphereStore();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const coreGeometry = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);
  const shellGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  useEffect(
    () => () => {
      coreGeometry.dispose();
      shellGeometry.dispose();
    },
    [coreGeometry, shellGeometry],
  );

  const nodes = useRef(new Map<AtomId, THREE.Group>());

  const setCursor = useCallback((cursor: string) => {
    document.body.style.cursor = cursor;
  }, []);
  useEffect(() => () => setCursor(""), [setCursor]);

  useFrame((state, delta) => {
    const step = 1 - Math.exp(-delta * ATOM_EASE);

    atoms.forEach((atom, index) => {
      const node = nodes.current.get(atom.id);
      const placement = layout[atom.id];
      if (!node || !placement) return;

      const isSelected = atom.id === selectedAtomId;
      const isDimmed = emphasis.atoms[atom.id] === "dimmed";

      const targetScale =
        placement.size *
        (isDimmed ? DIM_SCALE : isSelected ? SELECTED_SCALE : 1);
      node.scale.setScalar(node.scale.x + (targetScale - node.scale.x) * step);

      const core = node.getObjectByName("core") as THREE.Mesh | undefined;
      const shell = node.getObjectByName("shell") as THREE.Mesh | undefined;
      if (!core || !shell) return;

      const coreMaterial = core.material as THREE.MeshBasicMaterial;
      coreMaterial.color.lerp(
        isSelected ? SELECTED_COLOR : isDimmed ? DIM_COLOR : ATOM_COLOR,
        step,
      );
      const coreOpacity = isDimmed ? DIM_OPACITY : 1;
      coreMaterial.opacity += (coreOpacity - coreMaterial.opacity) * step;

      const shellMaterial = shell.material as THREE.MeshBasicMaterial;
      shellMaterial.color.lerp(isSelected ? SELECTED_COLOR : SHELL_COLOR, step);
      const shellOpacity = isDimmed
        ? SHELL_DIM_OPACITY
        : isSelected
          ? SHELL_SELECTED_OPACITY
          : SHELL_OPACITY;
      shellMaterial.opacity += (shellOpacity - shellMaterial.opacity) * step;

      // Reduced motion parks every shell at its own tilt: the lattice still
      // carries the depth, it just stops turning.
      if (!reducedMotion) {
        shell.rotation.y =
          index * 1.3 +
          state.clock.elapsedTime *
            (SHELL_SPIN_BASE + (index % 5) * SHELL_SPIN_STEP);
      }

      const moons = node.getObjectByName("moons");
      if (moons) {
        const { radius, speed } = moonOrbit(placement.rank);
        // Reduced motion holds the moons at fixed points on their orbit: the
        // radius still carries Rank and the count still carries hours, they
        // just stop travelling.
        const travel = reducedMotion
          ? index
          : state.clock.elapsedTime * speed + index;
        const moonOpacity = isDimmed ? DIM_OPACITY : 1;

        moons.children.forEach((moon, position) => {
          // Spread evenly round the one orbit, so the count can be taken at a
          // glance. Bunched moons read as one smeared moon.
          const angle = travel + (position / moons.children.length) * Math.PI * 2;
          moon.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);

          const moonMaterial = (moon as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          moonMaterial.opacity += (moonOpacity - moonMaterial.opacity) * step;
        });
      }
    });
  });

  return (
    <>
      {atoms.map((atom, index) => {
        const placement = layout[atom.id];
        if (!placement) return null;
        return (
          <group
            key={atom.id}
            position={placement.position as unknown as THREE.Vector3Tuple}
            scale={placement.size}
            ref={(node) => {
              if (node) nodes.current.set(atom.id, node);
              else nodes.current.delete(atom.id);
            }}
            onClick={(event) => {
              event.stopPropagation();
              store.selectAtom(atom.id);
            }}
            onPointerOver={() => setCursor("pointer")}
            onPointerOut={() => setCursor("")}
          >
            <mesh name="core" geometry={coreGeometry} scale={LATTICE_CORE_SCALE}>
              <meshBasicMaterial color={ATOM_COLOR} transparent />
            </mesh>
            {/*
              One orbit per Atom, tilted its own way, carrying a moon for every
              250 hours devoted to it. They share the plane so the count reads
              as a count rather than as several unrelated bodies.
            */}
            <group
              name="moons"
              rotation={[Math.PI / 2.4 + (index % 4) * 0.2, (index % 6) * 0.5, 0]}
            >
              {Array.from({ length: moonCount(atom.hoursSpent) }, (_, moon) => (
                <mesh key={moon} geometry={coreGeometry} scale={MOON_SIZE}>
                  <meshBasicMaterial color={MOON_COLOR} transparent />
                </mesh>
              ))}
            </group>
            <mesh
              name="shell"
              geometry={shellGeometry}
              rotation={[index * 0.7, index * 1.3, 0]}
            >
              <meshBasicMaterial
                color={SHELL_COLOR}
                wireframe
                transparent
                opacity={SHELL_OPACITY}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** How far below an Atom's node its Nameplate hangs. */
const NAMEPLATE_GAP = 0.03;

/** Scales Nameplate text down with camera distance, matching the scene. */
const NAMEPLATE_DISTANCE_FACTOR = 2.6;

/** Nameplate text size in px at distance factor 1, before Rank's boost. */
const NAMEPLATE_BASE_SIZE = 9;
const NAMEPLATE_RANK_SIZE = 6;

/**
 * A Nameplate under every Atom, always visible so the Sphere can be surveyed
 * without selecting anything. Rank sets the size, and the emphasis system
 * colours and fades it exactly as it does the Atom above it. DOM text rather
 * than SDF glyphs, so no font is fetched and the page's own face is used.
 */
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
              placement.position[1] - placement.size - NAMEPLATE_GAP,
              placement.position[2],
            ]}
            center
            distanceFactor={NAMEPLATE_DISTANCE_FACTOR}
            // Level with the page itself, so the Dossier and the Owner's
            // controls always paint over the labels.
            zIndexRange={[0, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className="block font-medium whitespace-nowrap transition-[color,opacity] duration-300"
              style={{
                fontSize: `${NAMEPLATE_BASE_SIZE + placement.rank * NAMEPLATE_RANK_SIZE}px`,
                color: isSelected
                  ? "#828fff"
                  : isDimmed
                    ? "#8a8f98"
                    : "#f7f8f8",
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
  /** Set only when *another* Atom is selected — not the same as "not highlighted". */
  isDimmed: boolean;
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
        isDimmed: emphasis.connections[connection.id] === "dimmed",
      });
    }

    return ends;
  }, [connections, layout, emphasis, selectedAtomId]);
}

/**
 * One line per Connection, between its two Atoms.
 *
 * At rest every Connection is drawn at its resting weight, so the Sphere shows
 * how the Atoms relate before anything is clicked. Selecting an Atom lifts the
 * Connections touching it to full brightness and pushes the rest well below
 * resting — the light moves, the lines do not come and go.
 *
 * Brightness is the only thing that changes, and it carries Strength at every
 * level, so a strong Connection reads as strong whether it is lit or at rest.
 */
function ConnectionLines() {
  const ends = useConnectionEnds();
  /** Eased brightness level per Connection, so emphasis changes fade. */
  const level = useRef(new Map<ConnectionId, number>());
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
      const target = connection.isHighlighted
        ? LINE_LEVEL_HIGHLIGHTED
        : connection.isDimmed
          ? LINE_LEVEL_DIMMED
          : LINE_LEVEL_NEUTRAL;

      const from = level.current.get(connection.id) ?? LINE_LEVEL_NEUTRAL;
      const lit = from + (target - from) * step;
      level.current.set(connection.id, lit);

      // The whole segment, always. Which end is `start` still matters to the
      // signal sweep, but a line drawn end to end doesn't care.
      position.setXYZ(
        index * 2,
        connection.start.x,
        connection.start.y,
        connection.start.z,
      );
      position.setXYZ(
        index * 2 + 1,
        connection.end.x,
        connection.end.y,
        connection.end.z,
      );

      // Additive blending: brightness is how the opacity reads, so the
      // Strength goes into the colour rather than a per-line material.
      const brightness =
        (LINE_BASE_BRIGHTNESS +
          connection.strength * LINE_STRENGTH_BRIGHTNESS) *
        lit;
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
 * An invisible, clickable cylinder along each *highlighted* Connection, so a
 * lit line is a route the visitor can take. Only lit Connections get a hit
 * area — a dimmed line is not a route, and must not swallow the clicks that
 * would otherwise clear the selection.
 */
function ConnectionHitAreas() {
  const { connections, layout, emphasis } = useSphere();
  const store = getSphereStore();

  const geometry = useMemo(
    () => new THREE.CylinderGeometry(CONNECTION_HIT_RADIUS, CONNECTION_HIT_RADIUS, 1, 6),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const setCursor = useCallback((cursor: string) => {
    document.body.style.cursor = cursor;
  }, []);
  useEffect(() => () => setCursor(""), [setCursor]);

  const routes = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const placed = [];
    for (const connection of connections) {
      if (emphasis.connections[connection.id] !== "highlighted") continue;
      const from = layout[connection.fromAtomId];
      const to = layout[connection.toAtomId];
      if (!from || !to) continue;

      const start = new THREE.Vector3(...from.position);
      const end = new THREE.Vector3(...to.position);
      const span = new THREE.Vector3().subVectors(end, start);

      placed.push({
        id: connection.id,
        position: start.clone().addScaledVector(span, 0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          up,
          span.clone().normalize(),
        ),
        length: Math.max(span.length(), 1e-4),
      });
    }
    return placed;
  }, [connections, layout, emphasis]);

  return (
    <>
      {routes.map((route) => (
        <mesh
          key={route.id}
          geometry={geometry}
          position={route.position}
          quaternion={route.quaternion}
          scale={[1, route.length, 1]}
          onClick={(event) => {
            event.stopPropagation();
            store.selectViaConnection(route.id);
          }}
          onPointerOver={() => setCursor("pointer")}
          onPointerOut={() => setCursor("")}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Frames the camera for the current selection, then lets go.
 *
 * On every selection change the camera eases the selected Atom round to face
 * the visitor, shifted left so the Dossier panel doesn't cover it — or, when
 * the selection clears, eases back out to the default idle framing. The moment
 * it arrives (or the visitor grabs the controls) it stops steering, so orbiting
 * and zooming are never fought.
 */
function CameraRig({
  controls,
  isInteracting,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  isInteracting: React.RefObject<boolean>;
}) {
  const { selectedAtomId, layout } = useSphere();
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const steering = useRef(false);
  const steeredSelection = useRef<AtomId | null>(null);

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit) return;

    if (selectedAtomId !== steeredSelection.current) {
      steeredSelection.current = selectedAtomId;
      steering.current = true;
    }
    // The visitor's hands beat the rig, always: grabbing the controls cancels
    // the flight, and it only re-arms on the next selection change.
    if (isInteracting.current) {
      steering.current = false;
      return;
    }
    if (!steering.current) return;

    const camera = state.camera;
    const placement = selectedAtomId ? layout[selectedAtomId] : undefined;

    let target: THREE.Vector3;
    let distance: number;
    let facing: THREE.Vector3 | null;
    let ease: number;

    if (!placement) {
      target = new THREE.Vector3();
      distance = IDLE_DISTANCE;
      facing = null;
      ease = CAMERA_IDLE_EASE;
    } else {
      target = new THREE.Vector3()
        .setFromMatrixColumn(camera.matrixWorld, 0)
        .normalize()
        .multiplyScalar(PANEL_SHIFT);
      distance = SELECTED_DISTANCE;
      facing = new THREE.Vector3(...placement.position).normalize();
      ease = CAMERA_EASE;
    }

    // Reduced motion cuts straight to the destination instead of sweeping.
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * ease);
    orbit.target.lerp(target, step);

    const offset = new THREE.Vector3().subVectors(camera.position, orbit.target);
    const length = offset.length() + (distance - offset.length()) * step;
    if (facing === null) {
      offset.setLength(length);
    } else {
      offset.normalize().lerp(facing, step).normalize().setLength(length);
    }
    camera.position.copy(orbit.target).add(offset);

    const settled =
      Math.abs(offset.length() - distance) < 0.01 &&
      orbit.target.distanceTo(target) < 0.01 &&
      (facing === null || offset.clone().normalize().dot(facing) > 0.9995);
    if (settled) steering.current = false;
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
  const { selectedAtomId } = useSphere();
  const [isIdle, setIsIdle] = useState(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isInteracting = useRef(false);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimer.current === null) return;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
  }, []);

  const handleInteractionStart = useCallback(() => {
    clearResumeTimer();
    isInteracting.current = true;
    setIsIdle(false);
  }, [clearResumeTimer]);

  const handleInteractionEnd = useCallback(() => {
    clearResumeTimer();
    isInteracting.current = false;
    resumeTimer.current = setTimeout(
      () => setIsIdle(true),
      RESUME_IDLE_AFTER_MS,
    );
  }, [clearResumeTimer]);

  useEffect(() => clearResumeTimer, [clearResumeTimer]);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, IDLE_DISTANCE], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onPointerMissed={() => getSphereStore().clearSelection()}
    >
      <color attach="background" args={[CANVAS_COLOR]} />
      <SphereShell />
      <ConnectionLines />
      <SignalTicks />
      <ConnectionHitAreas />
      <AtomNodes />
      <Nameplates />
      <CameraRig controls={controlsRef} isInteracting={isInteracting} />
      <OrbitControls
        ref={controlsRef}
        autoRotate={isIdle && selectedAtomId === null}
        autoRotateSpeed={AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={DAMPING_FACTOR}
        enablePan={false}
        minDistance={0.4}
        maxDistance={6}
        rotateSpeed={ROTATE_SPEED}
        zoomSpeed={ZOOM_SPEED}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />
    </Canvas>
  );
}

/**
 * ADR-0004 prototype fixture — throwaway. Removed before merge.
 *
 * The seed Sphere from `supabase/seed.sql`, in memory. Prototypes don't touch
 * Supabase: the question is what something should look like, and a fixture
 * means the answer is the same on every machine and doesn't need a database.
 *
 * The hours spread (60 → 1200, a 20× range) is the whole point for the Rank
 * prototypes — it is what the current linear curve flattens.
 */

import type { Atom, Connection } from "@/sphere/domain";

const ATOM_ROWS: Array<[label: string, description: string, hours: number]> = [
  ["TypeScript", "Types at the edges, inference in the middle.", 1200],
  ["React", "Components, state, and knowing when not to reach for it.", 950],
  ["Next.js", "App router, server components, and the rendering boundary.", 620],
  ["Postgres", "Relational modelling, indexes, and query plans.", 540],
  ["CSS", "Layout, cascade, and the parts people skip.", 480],
  ["Node.js", "The event loop, streams, and the module story.", 430],
  ["Testing", "Seams, fakes, and tests that survive a refactor.", 400],
  ["Git", "Branching, rebasing, and recovering from mistakes.", 360],
  ["Three.js", "Scene graphs, materials, and the render loop.", 310],
  ["Design systems", "Tokens, surfaces, and keeping a UI coherent.", 260],
  ["Accessibility", "Semantics, focus order, and screen reader behaviour.", 220],
  ["Product design", "Deciding what to build before building it.", 200],
  ["Supabase", "Postgres with auth, RLS, and a client that fits.", 180],
  ["Docker", "Images, layers, and reproducible environments.", 150],
  ["SQL tuning", "Reading plans and making slow queries fast.", 130],
  ["Linear algebra", "Vectors and matrices, mostly in service of graphics.", 90],
  ["GLSL", "Shaders, and thinking one pixel at a time.", 70],
  ["Rust", "Ownership, borrowing, and fighting the compiler.", 60],
];

const CONNECTION_ROWS: Array<
  [from: string, to: string, strength: number, description: string]
> = [
  ["TypeScript", "React", 0.9, "Typed props and hooks are most of the daily work."],
  ["React", "Next.js", 0.95, "Next.js is the frame React sits in here."],
  ["TypeScript", "Next.js", 0.8, "The whole app is typed end to end."],
  ["Next.js", "Supabase", 0.7, "Data reaches the page through the Supabase client."],
  ["Supabase", "Postgres", 0.95, "Supabase is Postgres with the edges filled in."],
  ["Postgres", "SQL tuning", 0.85, "Tuning is where the schema knowledge pays off."],
  ["React", "CSS", 0.65, "Styling components is inseparable from writing them."],
  ["CSS", "Design systems", 0.75, "Tokens land as CSS custom properties."],
  ["Design systems", "Accessibility", 0.6, "Contrast and focus states are design decisions."],
  ["React", "Accessibility", 0.55, "Semantics get decided at the component level."],
  ["Three.js", "GLSL", 0.7, "Custom materials mean writing shaders."],
  ["Three.js", "Linear algebra", 0.8, "Every transform is a matrix."],
  ["Three.js", "React", 0.6, "react-three-fiber renders the scene graph."],
  ["TypeScript", "Node.js", 0.7, "Same language on both sides."],
  ["Node.js", "Docker", 0.45, "Packaging the runtime for deploys."],
  ["Testing", "TypeScript", 0.6, "Types remove a whole category of test."],
  ["Testing", "React", 0.5, "Testing at the seam, not the markup."],
  ["Git", "Testing", 0.35, "Green before you push."],
  ["Product design", "Design systems", 0.65, "Deciding what to build shapes the system."],
  ["Product design", "Accessibility", 0.4, "Who can use it is part of what it is."],
  ["Rust", "Linear algebra", 0.25, "Mostly through graphics side projects."],
  ["Docker", "Postgres", 0.4, "Running the database locally."],
];

/** Ids are the labels slugged, so the fixed layout seed is stable and readable. */
const idOf = (label: string) => label.toLowerCase().replace(/[^a-z]+/g, "-");

export const PROTO_ATOMS: Atom[] = ATOM_ROWS.map(
  ([label, description, hoursSpent]) => ({
    id: idOf(label),
    label,
    description,
    hoursSpent,
  }),
);

export const PROTO_CONNECTIONS: Connection[] = CONNECTION_ROWS.map(
  ([from, to, strength, description]) => ({
    id: `${idOf(from)}--${idOf(to)}`,
    fromAtomId: idOf(from),
    toAtomId: idOf(to),
    strength,
    description,
  }),
);

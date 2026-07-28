import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSphereStore } from "./store";
import { SupabaseSphereRepository } from "./supabase-repository";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

describe("SupabaseSphereRepository against the real project", () => {
  it("loads the Sphere through the store and lays every Atom out", async () => {
    const store = createSphereStore(new SupabaseSphereRepository(client));

    await store.load();

    const { status, error, atoms, connections, layout } = store.getState();
    expect(error).toBeNull();
    expect(status).toBe("ready");
    expect(atoms.length).toBeGreaterThan(0);
    expect(connections.length).toBeGreaterThan(0);

    for (const atom of atoms) {
      const placement = layout[atom.id];
      expect(placement, `no layout for ${atom.label}`).toBeDefined();
      expect(Math.hypot(...placement.position)).toBeCloseTo(
        placement.orbitRadius,
        6,
      );
      expect(Number.isFinite(placement.size)).toBe(true);
    }

    // Rank is relative, so the most-invested Atom should be the biggest.
    const biggest = [...atoms].sort(
      (a, b) => layout[b.id].size - layout[a.id].size,
    )[0];
    const mostHours = [...atoms].sort(
      (a, b) => b.hoursSpent - a.hoursSpent,
    )[0];
    expect(biggest.id).toBe(mostHours.id);
  });

  it("rejects an unauthenticated write to atoms", async () => {
    const { error } = await client
      .from("atoms")
      .insert({ label: "anonymous write attempt" });

    expect(error?.message ?? "ACCEPTED").toContain("row-level security");
  });

  it("rejects an unauthenticated write to connections", async () => {
    const { error } = await client.from("connections").insert({
      from_atom_id: "00000000-0000-0000-0000-000000000001",
      to_atom_id: "00000000-0000-0000-0000-000000000002",
      strength: 0.5,
      description: "anonymous write attempt",
    });

    expect(error?.message ?? "ACCEPTED").toContain("row-level security");
  });
});

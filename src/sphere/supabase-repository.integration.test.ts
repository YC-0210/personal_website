import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSphereStore } from "./store";
import { SupabaseSphereRepository } from "./supabase-repository";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

describe("SupabaseSphereRepository against the real project", () => {
  it("loads an empty Sphere through the store", async () => {
    const store = createSphereStore(new SupabaseSphereRepository(client));

    await store.load();

    expect(store.getState().error).toBeNull();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().atoms).toEqual([]);
    expect(store.getState().connections).toEqual([]);
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

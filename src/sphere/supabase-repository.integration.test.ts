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

  /**
   * These go through the repository rather than hand-rolling the insert, so they
   * check two things at once. RLS has to refuse the write — and PostgREST
   * validates column names *before* RLS, so a mismatch between the repository's
   * payload and the live schema would come back as "could not find the column"
   * instead. Reaching the RLS refusal is therefore also proof that the columns
   * the repository writes are the columns the table has.
   */
  it("rejects an unauthenticated Atom write, having recognised every column", async () => {
    const repository = new SupabaseSphereRepository(client);

    await expect(
      repository.createAtom({
        label: "anonymous write attempt",
        description: "",
        hoursSpent: 1,
      }),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects an unauthenticated Connection write, having recognised every column", async () => {
    const repository = new SupabaseSphereRepository(client);

    await expect(
      repository.createConnection({
        fromAtomId: "00000000-0000-0000-0000-000000000001",
        toAtomId: "00000000-0000-0000-0000-000000000002",
        strength: 0.5,
        description: "anonymous write attempt",
      }),
    ).rejects.toThrow(/row-level security/);
  });
});

/**
 * The Owner's half of the same story: with a real session, the writes RLS just
 * refused go through and come back as what was asked for.
 *
 * This needs the Owner's password, which is not in the repo, so it is skipped
 * unless SPHERE_OWNER_EMAIL and SPHERE_OWNER_PASSWORD are exported. Everything
 * it creates is torn down at the end — deleting the two Atoms cascades the
 * Connection with them — so the real Sphere is left as it was found.
 */
const ownerEmail = process.env.SPHERE_OWNER_EMAIL;
const ownerPassword = process.env.SPHERE_OWNER_PASSWORD;

describe.skipIf(!ownerEmail || !ownerPassword)(
  "Owner writes against the real project",
  () => {
    it("round-trips a Connection create, edit and delete", async () => {
      const owner = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { error: signInError } = await owner.auth.signInWithPassword({
        email: ownerEmail!,
        password: ownerPassword!,
      });
      expect(signInError).toBeNull();

      const repository = new SupabaseSphereRepository(owner);
      const stamp = String(process.hrtime.bigint());
      const from = await repository.createAtom({
        label: `integration-check-a-${stamp}`,
        description: "Temporary, deleted at the end of this test.",
        hoursSpent: 1,
      });
      const to = await repository.createAtom({
        label: `integration-check-b-${stamp}`,
        description: "Temporary, deleted at the end of this test.",
        hoursSpent: 2,
      });

      try {
        const created = await repository.createConnection({
          fromAtomId: from.id,
          toAtomId: to.id,
          strength: 0.25,
          description: "Created by the integration check.",
        });
        expect(created.fromAtomId).toBe(from.id);
        expect(created.toAtomId).toBe(to.id);
        // Postgres `numeric` arrives as a string over PostgREST; the repository
        // is what keeps that off the domain, so assert on the number.
        expect(created.strength).toBe(0.25);

        const edited = await repository.updateConnection(created.id, {
          fromAtomId: from.id,
          toAtomId: to.id,
          strength: 0.75,
          description: "Edited by the integration check.",
        });
        expect(edited.id).toBe(created.id);
        expect(edited.strength).toBe(0.75);
        expect(edited.description).toBe("Edited by the integration check.");

        // Read it back through the load path rather than trusting the write's
        // own echo of itself.
        const reloaded = (await repository.loadSnapshot()).connections.find(
          (connection) => connection.id === created.id,
        );
        expect(reloaded).toEqual(edited);

        await repository.deleteConnection(created.id);
        const afterDelete = (await repository.loadSnapshot()).connections.find(
          (connection) => connection.id === created.id,
        );
        expect(afterDelete).toBeUndefined();
      } finally {
        await repository.deleteAtom(from.id);
        await repository.deleteAtom(to.id);
        await owner.auth.signOut();
      }
    });
  },
);

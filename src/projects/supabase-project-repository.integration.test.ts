import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createProjectStore } from "./project-store";
import { SupabaseProjectRepository } from "./supabase-project-repository";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/**
 * The Project store against the real project, as a Visitor.
 *
 * This exists because of a bug the rest of the suite structurally could not
 * see. The first version of the Projects policies had `projects` ask
 * `daylog_entries` whether anything in it was published, and `daylog_entries`
 * ask `projects` whether its parent was live. Both reads are under RLS, so each
 * policy re-entered the other and Postgres refused every read outright:
 *
 *   infinite recursion detected in policy for relation "projects"
 *
 * The store tests run against an in-memory fake and the browser tests stub
 * Supabase — neither executes a policy, so both stayed green while the
 * deployed section could not load a single row. A real policy needs a real
 * database, and this is the only place the repo has one.
 *
 * Deliberately thin. It is not here to re-test the read rules — the store tests
 * already hold those against the fake, where they can be exhaustive. It is here
 * to prove the policies *evaluate*, and that the shape Postgres hands back is
 * the shape the repository claims.
 */
describe("SupabaseProjectRepository against the real project", () => {
  it("loads Projects, the Daylog and the Bondings without the policies eating themselves", async () => {
    const store = createProjectStore(new SupabaseProjectRepository(client));

    await store.load();

    const { status, error } = store.getState();

    // The whole point. A recursive policy surfaces here, as a load that failed
    // with the database's own message rather than as a wrong answer.
    expect(error).toBeNull();
    expect(status).toBe("ready");
  });

  it("shows a Visitor only Projects with a published day in them", async () => {
    const store = createProjectStore(new SupabaseProjectRepository(client));

    await store.load();

    // Signed out, so RLS has already done the filtering before anything
    // reaches the store. Every Project that arrives must therefore have a
    // published day, and every day that arrives must be published — if either
    // is false the policy is admitting rows it should not, which is the
    // failure that matters more than a crash.
    for (const project of store.getState().projects) {
      expect(project.deletedAt).toBeNull();
      expect(
        store.lastLoggedOn(project.id),
        `${project.name} reached a Visitor with nothing published in it`,
      ).not.toBeNull();
    }

    for (const entry of store.getState().entries) {
      expect(
        entry.publishedAt,
        `a draft day of ${entry.projectId} reached a Visitor`,
      ).not.toBeNull();
    }
  });
});

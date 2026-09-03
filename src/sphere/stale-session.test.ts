import { describe, expect, it } from "vitest";

import { recoverStaleSession, SESSION_GONE } from "@/lib/session-recovery";
import type { Atom } from "./domain";
import { FakeAuthProvider } from "./fake-auth-provider";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore } from "./store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

const typescript: Atom = {
  id: "atom-typescript",
  label: "TypeScript",
  description: "Types at the edges, inference in the middle.",
  hoursSpent: 400,
  learningState: "ongoing",
};

/**
 * The store as the page actually assembles it: the repository wrapped so a
 * stale access token costs a refresh rather than a reload.
 */
async function ownerStore() {
  const repository = new FakeSphereRepository({ atoms: [typescript] });
  const auth = new FakeAuthProvider({ owner: OWNER, signedIn: true });
  const store = createSphereStore(
    recoverStaleSession(repository, () => auth.refreshSession()),
    auth,
  );
  await store.restoreSession();
  await store.load();
  return { repository, auth, store };
}

describe("an Owner write that lands on a stale access token", () => {
  it("goes through anyway, without the Owner reloading the page", async () => {
    const { repository, auth, store } = await ownerStore();
    // The token died while the laptop was asleep. The next click is the first
    // thing to find out.
    repository.failWith(new Error("Could not save the Atom: JWT expired"));
    auth.onRefresh(() => repository.failWith(null));

    await store.editAtom(typescript.id, {
      label: "TypeScript",
      description: "Types at the edges.",
      hoursSpent: 420,
    });

    expect(store.getAtom(typescript.id)!.hoursSpent).toBe(420);
    expect(store.getState().writeError).toBeNull();
    expect(auth.refreshCount).toBe(1);
  });

  it("says so plainly when the session has genuinely ended", async () => {
    const { repository, store } = await ownerStore();
    repository.failWith(new Error("Could not save the Atom: JWT expired"));

    await expect(
      store.editAtom(typescript.id, {
        label: "TypeScript",
        description: "Types at the edges.",
        hoursSpent: 420,
      }),
    ).rejects.toThrow(SESSION_GONE);

    expect(store.getState().writeError).toBe(SESSION_GONE);
  });
});

describe("a load that lands on a stale access token", () => {
  it("recovers rather than leaving the Sphere in an error state", async () => {
    const { repository, auth, store } = await ownerStore();
    repository.failWith(new Error("Could not load Atoms: JWT expired"));
    auth.onRefresh(() => repository.failWith(null));

    await store.load();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().error).toBeNull();
    expect(store.getState().atoms).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";

import { FakeAuthProvider } from "./fake-auth-provider";
import { FakeSphereRepository } from "./fake-repository";
import { createSphereStore } from "./store";

const OWNER = { email: "owner@example.com", password: "correct-horse" };

function signedOutStore() {
  const auth = new FakeAuthProvider({ owner: OWNER });
  const store = createSphereStore(new FakeSphereRepository(), auth);
  return { auth, store };
}

describe("Owner authentication", () => {
  it("starts signed out, with Edit Mode off", () => {
    const { store } = signedOutStore();

    expect(store.getState().owner).toBeNull();
    expect(store.getState().isEditMode).toBe(false);
  });

  it("enters Edit Mode when the Owner signs in", async () => {
    const { store } = signedOutStore();

    await store.signIn(OWNER.email, OWNER.password);

    expect(store.getState().owner).toEqual({ email: OWNER.email });
    expect(store.getState().isEditMode).toBe(true);
    expect(store.getState().authError).toBeNull();
  });

  it("stays a visitor when the password is wrong", async () => {
    const { store } = signedOutStore();

    await store.signIn(OWNER.email, "not-the-password");

    expect(store.getState().owner).toBeNull();
    expect(store.getState().isEditMode).toBe(false);
    expect(store.getState().authError).toBe("Invalid login credentials");
  });

  it("stays a visitor for an email that is not the Owner's", async () => {
    const { store } = signedOutStore();

    await store.signIn("someone-else@example.com", OWNER.password);

    expect(store.getState().isEditMode).toBe(false);
    expect(store.getState().authError).toBe("Invalid login credentials");
  });

  it("clears the previous error on the next attempt", async () => {
    const { store } = signedOutStore();
    await store.signIn(OWNER.email, "wrong");

    await store.signIn(OWNER.email, OWNER.password);

    expect(store.getState().authError).toBeNull();
    expect(store.getState().isEditMode).toBe(true);
  });

  it("clears a stale error the moment a new attempt starts", async () => {
    const { store } = signedOutStore();
    await store.signIn(OWNER.email, "wrong");
    expect(store.getState().authError).not.toBeNull();

    const pending = store.signIn(OWNER.email, OWNER.password);

    // The old message goes as soon as the Owner submits, not when the auth
    // service eventually answers.
    expect(store.getState().authError).toBeNull();
    await pending;
  });

  it("drops out of Edit Mode on sign-out", async () => {
    const { store } = signedOutStore();
    await store.signIn(OWNER.email, OWNER.password);

    await store.signOut();

    expect(store.getState().owner).toBeNull();
    expect(store.getState().isEditMode).toBe(false);
  });

  it("picks up a session the Owner already had", async () => {
    const auth = new FakeAuthProvider({ owner: OWNER, signedIn: true });
    const store = createSphereStore(new FakeSphereRepository(), auth);

    await store.restoreSession();

    expect(store.getState().isEditMode).toBe(true);
    expect(auth.signInAttempts).toBe(0);
  });

  it("drops Edit Mode if the session goes away on its own", async () => {
    const auth = new FakeAuthProvider({ owner: OWNER, signedIn: true });
    const store = createSphereStore(new FakeSphereRepository(), auth);
    await store.restoreSession();

    auth.expireSession();

    expect(store.getState().isEditMode).toBe(false);
  });

  it("falls back to the visitor view when the session cannot be read", async () => {
    const auth = new FakeAuthProvider({ owner: OWNER, signedIn: true });
    auth.failWith(new Error("auth service unreachable"));
    const store = createSphereStore(new FakeSphereRepository(), auth);

    await store.restoreSession();

    expect(store.getState().isEditMode).toBe(false);
  });

  it("notifies subscribers when Edit Mode turns on", async () => {
    const { store } = signedOutStore();
    const seen: boolean[] = [];
    store.subscribe((state) => seen.push(state.isEditMode));

    await store.signIn(OWNER.email, OWNER.password);

    expect(seen).toContain(true);
  });

  it("refuses to sign in at all when no provider is wired up", async () => {
    const store = createSphereStore(new FakeSphereRepository());

    await store.signIn(OWNER.email, OWNER.password);

    expect(store.getState().isEditMode).toBe(false);
    expect(store.getState().authError).toBe("Authentication is not configured.");
  });

  it("leaves the visitor-facing Sphere untouched either way", async () => {
    const atoms = [
      { id: "a", label: "A", description: "", hoursSpent: 100 },
      { id: "b", label: "B", description: "", hoursSpent: 50 },
    ];
    const connections = [
      {
        id: "a-b",
        fromAtomId: "a",
        toAtomId: "b",
        strength: 0.5,
        description: "",
      },
    ];
    const { store } = signedOutStore();
    // Reload through a populated repository so there is something to compare.
    const populated = createSphereStore(
      new FakeSphereRepository({ atoms, connections }),
      new FakeAuthProvider({ owner: OWNER }),
    );
    await populated.load();
    const asVisitor = {
      atoms: populated.getState().atoms,
      connections: populated.getState().connections,
      selectedAtomId: populated.getState().selectedAtomId,
    };

    await populated.signIn(OWNER.email, OWNER.password);

    expect({
      atoms: populated.getState().atoms,
      connections: populated.getState().connections,
      selectedAtomId: populated.getState().selectedAtomId,
    }).toEqual(asVisitor);
    expect(store.getState().isEditMode).toBe(false);
  });
});

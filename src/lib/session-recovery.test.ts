import { describe, expect, it, vi } from "vitest";

import { FakeSphereRepository } from "@/sphere/fake-repository";
import { recoverStaleSession, SESSION_GONE } from "./session-recovery";

/**
 * What PostgREST hands back when the access token in the request has already
 * expired. The repositories wrap it in a sentence of their own, which is why
 * the match has to survive being embedded in one.
 */
function jwtExpired(): Error {
  return new Error("Could not add the Atom: JWT expired");
}

const draft = {
  label: "Three.js",
  description: "Scene graphs and shaders.",
};

describe("recovering a stale session", () => {
  it("refreshes the token and replays a call the expired one was refused for", async () => {
    const repository = new FakeSphereRepository();
    repository.failWith(jwtExpired());

    // Refreshing is what makes the next attempt succeed — exactly what the
    // reload the Owner does by hand achieves.
    const refresh = vi.fn(async () => repository.failWith(null));

    const recovering = recoverStaleSession(repository, refresh);
    const atom = await recovering.createAtom(draft);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(atom.label).toBe("Three.js");
  });
});

describe("when refreshing does not help", () => {
  it("gives up after one replay and says the session is gone", async () => {
    const repository = new FakeSphereRepository();
    repository.failWith(jwtExpired());
    // A refresh that resolves but changes nothing — the refresh token itself
    // has been revoked, so the replayed call is refused the same way.
    const refresh = vi.fn(async () => {});

    const recovering = recoverStaleSession(repository, refresh);

    await expect(recovering.createAtom(draft)).rejects.toThrow(SESSION_GONE);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("says the same when the refresh itself fails", async () => {
    const repository = new FakeSphereRepository();
    repository.failWith(jwtExpired());
    const refresh = vi.fn(async () => {
      throw new Error("Invalid Refresh Token: Already Used");
    });

    const recovering = recoverStaleSession(repository, refresh);

    await expect(recovering.createAtom(draft)).rejects.toThrow(SESSION_GONE);
  });
});

describe("failures that are not the session", () => {
  it("are passed through untouched, without a refresh", async () => {
    const repository = new FakeSphereRepository();
    const refused = new Error("Could not add the Atom: duplicate key value");
    repository.failWith(refused);
    const refresh = vi.fn(async () => {});

    const recovering = recoverStaleSession(repository, refresh);

    await expect(recovering.createAtom(draft)).rejects.toThrow(refused);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("a replay that fails for its own reasons", () => {
  it("reports that reason, not the session", async () => {
    const repository = new FakeSphereRepository();
    repository.failWith(jwtExpired());
    // The refresh works — the token was genuinely stale — and the replayed
    // call then fails on the merits. Blaming the session would send the Owner
    // to sign in again over a problem signing in cannot fix.
    const refresh = vi.fn(async () =>
      repository.failWith(new Error("Could not add the Atom: duplicate key value")),
    );

    const recovering = recoverStaleSession(repository, refresh);

    await expect(recovering.createAtom(draft)).rejects.toThrow("duplicate key value");
  });
});

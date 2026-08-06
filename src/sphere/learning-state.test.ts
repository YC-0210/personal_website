import { describe, expect, it } from "vitest";

import { toLearningState } from "./domain";

/**
 * The boundary where a value from the store of record stops being trusted.
 *
 * Every Atom written before this column existed has no learning state at all,
 * and Postgres hands numerics back as strings, so "whatever arrived" is not a
 * `LearningState` until this says it is.
 */
describe("reading a learning state off a stored row", () => {
  it("takes the two states it knows", () => {
    expect(toLearningState("learned")).toBe("learned");
    expect(toLearningState("ongoing")).toBe("ongoing");
  });

  it("reads anything it does not recognise as still being learned", () => {
    // Never the other way round: claiming the Owner had finished with a topic
    // because a column was null would be a lie the Sphere then draws.
    for (const value of [null, undefined, "", "LEARNED", "done", 1, {}, []]) {
      expect(toLearningState(value)).toBe("ongoing");
    }
  });
});

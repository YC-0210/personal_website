import type { SphereStatus } from "./store";

/** Everything the notice needs to know about the Sphere, and nothing else. */
export interface SceneNoticeInput {
  status: SphereStatus;
  atomCount: number;
  error: string | null;
  isEditMode: boolean;
}

/** A message the scene view puts on the canvas in place of Atoms. */
export interface SceneNotice {
  title: string;
  /** The line under the title, or null when the title says everything. */
  detail: string | null;
}

/**
 * What a sighted visitor should read when the scene has nothing to draw.
 *
 * Returns null whenever the Sphere is drawing something, which is the normal
 * case — this only speaks up for the two states the canvas cannot show on its
 * own, and a black canvas is otherwise the Sphere doing its job.
 */
export function sceneNotice({
  status,
  atomCount,
  error,
  isEditMode,
}: SceneNoticeInput): SceneNotice | null {
  if (status === "error") {
    return { title: "The Sphere could not be loaded.", detail: error };
  }
  if (status === "ready" && atomCount === 0) {
    return {
      title: "The Sphere is empty.",
      // Only the Owner is told to add one. A Visitor gets no call to action:
      // the way in is the corner mark, which reads as a brand dot on purpose.
      detail: isEditMode ? "Add the first Atom to begin." : null,
    };
  }
  return null;
}

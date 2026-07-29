/**
 * Whether this browser can render the Sphere at all.
 *
 * Asked once, before mounting the canvas: a browser without WebGL should get
 * the text outline instead of a black rectangle and a console error.
 */
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  // Cached because this is read from a `useSyncExternalStore` snapshot, which
  // must be cheap and must return the same value every time it is asked.
  return (cached ??= detectWebGL());
}

function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    // Some browsers throw rather than returning null when WebGL is blocked.
    return false;
  }
}

/**
 * Whether this browser can raise a WebGL context at all. When it can't, the
 * page swaps the 3D scene for the text index rather than showing a dead canvas.
 */
let cached: boolean | null = null;

export function isWebGLSupported(): boolean {
  cached ??= probe();
  return cached;
}

function probe(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

/**
 * How far back the camera has to sit for the whole Sphere to be on screen.
 *
 * A perspective camera's field of view is vertical, so framing to height alone
 * is fine on a landscape desktop and wrong on a portrait phone: at 390×844 the
 * horizontal field is less than half the vertical one, and the Atoms on the
 * left and right of the Sphere fall off the sides where nobody can reach them.
 */
export function fitDistance(
  viewport: { width: number; height: number },
  fovRadians: number,
  extent: number,
): number {
  const verticalHalf = Math.tan(fovRadians / 2);
  // The horizontal field is the vertical one scaled by aspect, so anything
  // narrower than square is the binding constraint. Wider than square, height
  // still governs — otherwise a broad desktop window would push the Sphere
  // away into a speck in the middle.
  const aspect = viewport.height === 0 ? 1 : viewport.width / viewport.height;
  return extent / (verticalHalf * Math.min(1, aspect));
}

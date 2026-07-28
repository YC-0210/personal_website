# Design tokens

The visual source of truth for this site: Linear-app restraint on a near-black
canvas, one chromatic accent, no atmospheric gradients and no second accent.

> **Incomplete.** The `surface-1`…`surface-4` ladder referenced by issue #1 was
> extracted from linear.app but never committed. The tokens below are the ones
> recorded in issue #1; the surface values still need to come from that original
> extraction rather than being guessed at. Nothing in the walking skeleton uses
> a surface yet — the first panel that does will need them filled in.

## Color

| Token    | Value     | Use                                                     |
| -------- | --------- | ------------------------------------------------------- |
| `canvas` | `#010102` | Page background. The Sphere scene clears to this.       |
| `ink`    | `#f7f8f8` | Primary text.                                           |
| `accent` | `#5e6ad2` | Lavender-blue. The only chromatic color on the site.    |

Surfaces (`surface-1` … `surface-4`) form a four-step ladder for panels, each
separated from the canvas by a **1px hairline border** rather than a shadow.

### Accent: do / don't

- **Do** use it for the brand mark, the primary CTA, focus rings, link emphasis,
  and the selected-Atom highlight state.
- **Don't** use it as a section or card fill, and don't introduce a second
  chromatic accent. Everything that isn't accent is ink/surface grayscale.

## Radii

| Token       | Value  | Use               |
| ----------- | ------ | ----------------- |
| `rounded.md` | `8px`  | Buttons, inputs.  |
| `rounded.lg` | `12px` | Cards, panels.    |

## Typography

Inter or Geist Sans, weights 500 / 600 / 700 — the open-source stand-in for
Linear's proprietary display and text typefaces. This site uses **Inter**.

## The Sphere itself

The 3D scene stays inside the same restraint: near-black canvas, sparse glowing
nodes, lavender only for the selected-Atom highlight, everything else in the
ink/surface grayscale.

## Where these live in code

`src/app/globals.css` declares the tokens in a Tailwind `@theme` block, so they
are available as `bg-canvas`, `text-ink`, `text-accent`, `rounded-md`,
`rounded-lg`. Only the tokens in active use are declared; the rest are added as
the components that need them are built.

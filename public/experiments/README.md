# Color-based spacing experiment

Open `color-based-spacing.html` directly in a browser, or run the website with
`npm run dev` and visit `/experiments/color-based-spacing.html`.

This is the standalone article demo developed on 2026-10-04. It contains 30
illustrative articles: six each in Mathematics, Physics, Programming, Design,
and Biology. Subject membership determines color. An article's mass is its
number of unique, undirected connections, with a minimum of 1.

Select an article and toggle its connections to change both endpoints' masses.
Heavier articles swap into nearby vertices within their subject, and changes
animate over three seconds. The mass-weighted core stays fixed at the origin.
Geometry and core remain invisible; connection lines and article titles can
be enabled separately. Drag to rotate and scroll to zoom.

The example starts with 68 equal-strength connections. It has no external
dependencies, backend access, or live website data. Edits last for the current
page session. The existing website homepage is unchanged.

Validation before saving: browser checks covered the 5 × 6 article count,
connection-derived mass, symmetric connection changes, minimum mass for an
isolated article, unique vertex assignments within subjects, fixed center of
mass during drift, reset, and mobile width. The saved HTML is byte-for-byte
identical to the reviewed standalone demo.

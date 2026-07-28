# Next.js + react-three-fiber for the front end

The homepage centers on a real-time 3D scene (Atoms and Connections around the Sphere) alongside an owner-editing UI and API routes for persistence, so we need both a mature meta-framework and a declarative Three.js binding. We chose Next.js (TypeScript, Tailwind CSS) with react-three-fiber over a bare Vite+Three.js SPA or SvelteKit+Threlte, because it gives us built-in API routes for the Supabase-backed editing flow and the largest ecosystem of examples for combining React UI with WebGL scenes, at the cost of slightly more framework overhead than a raw Vite setup.

## Considered options

- Vite + React + Three.js directly — lighter dev loop, but no built-in API routes; the Edit Mode backend would need a separate service.
- SvelteKit + Threlte — smaller runtime, but a much smaller ecosystem of 3D + interactive-editing examples to draw on.

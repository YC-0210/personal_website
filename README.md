# Knowledge Sphere

A full-viewport, interactive 3D sphere of the things I've learned (Atoms) and
how they relate (Connections). See issue #1 for the full spec, `DESIGN.md` for
the visual tokens.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

| Script                     | What it does                                              |
| -------------------------- | --------------------------------------------------------- |
| `npm run dev`              | Dev server on http://localhost:3000                        |
| `npm run build`            | Production build                                           |
| `npm test`                 | Sphere store tests against the in-memory fake repository   |
| `npm run test:integration` | The one check against the real Supabase project (see below) |
| `npm run typecheck`        | `tsc --noEmit`                                             |
| `npm run lint`             | ESLint                                                     |

## How it's put together

The **Sphere store** (`src/sphere/store.ts`) owns Atom, Connection and selection
state. It reaches persistence only through the `SphereRepository` interface, which
has two implementations: `FakeSphereRepository` (in-memory, for tests) and
`SupabaseSphereRepository` (the real one). The react-three-fiber scene, and later
the Owner's auth and edit forms, are thin consumers — they read store state and
call store operations, and hold no Sphere logic themselves.

That makes the store's public API the single seam the feature is tested through.
`npm test` runs entirely against the fake, so it needs no network.

### The integration check

`src/sphere/supabase-repository.integration.test.ts` is the one test that talks to
the real project: it confirms a load round-trips and that RLS rejects
unauthenticated writes. It needs credentials, so it is excluded from `npm test`:

```bash
set -a && . ./.env.local && set +a && npm run test:integration
```

## Database

The schema lives in `supabase/migrations/`. Reads are public; writes require an
authenticated session, enforced by RLS. Connections are undirected — a unique
index on the canonically-ordered endpoint pair keeps A-B and B-A from both
existing — and cascade-delete when either endpoint Atom is removed.

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

Two tests talk to the real project.
`src/sphere/supabase-repository.integration.test.ts` confirms a load round-trips
and that RLS rejects unauthenticated writes.
`src/projects/supabase-project-repository.integration.test.ts` confirms the
Projects policies actually evaluate — they refer across two tables, and a policy
that refers back to the one asking sends Postgres into infinite recursion, which
neither the fake nor the browser stub can reproduce because neither runs a
policy.

They need credentials, so both are excluded from `npm test`:

```bash
set -a && . ./.env.local && set +a && npm run test:integration
```

It also has an Owner half — an authenticated Connection create/edit/delete
round-trip, which cleans up everything it makes. That needs the Owner's password,
which is not in the repo, so it **skips** unless `SPHERE_OWNER_EMAIL` and
`SPHERE_OWNER_PASSWORD` are set in `.env.local`.

## Database

### Migrations are applied by hand

**Nothing applies them for you.** Vercel deploys the Next.js app and never
touches Postgres, so a deploy carrying a new migration ships code that queries a
table the database does not have — which reads, in the browser, as
`Could not find the table 'public.<name>' in the schema cache`.

Apply the migrations *before* promoting the deploy that needs them, with
`supabase db push` against the linked project or through the Supabase SQL
editor. If that error appears in production, this is almost always why: check
`supabase/migrations/` against the project's applied list before looking at the
client code.

The schema lives in `supabase/migrations/`. Reads are public; writes require an
authenticated session, enforced by RLS. Connections are undirected — a unique
index on the canonically-ordered endpoint pair keeps A-B and B-A from both
existing — and cascade-delete when either endpoint Atom is removed.

Images live in two Storage buckets under that same rule — `article-images` for
an Article's, `daylog-images` for a day's: public to read, Owner-only to write,
capped at 5 MB and limited to the image types the editor can produce. ADR-0010
says why the buckets are public, what that costs unpublished writing, and why
there are two of them rather than one.

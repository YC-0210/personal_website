# Supabase for Atom/Connection data and Owner auth

Edit Mode needs both a place to persist Atoms and Connections and a way to authenticate the single Owner account, with changes applying live immediately. We chose Supabase (Postgres + built-in Auth) over a git-based content store or a separately-assembled DB+auth stack, because it gives us both concerns in one system with a single email/password Owner account, and a Supabase MCP connector is already available in this environment.

## Considered options

- Git-based content (JSON/MDX committed via an API route) — no separate database, but every edit becomes a commit + redeploy, which fights the "live immediately" requirement, and has no natural place for Owner auth.
- A different managed Postgres/KV (e.g. Vercel Postgres, Upstash) paired with hand-rolled auth — avoids Supabase-specific lock-in, but means building session/auth handling from scratch for no real benefit here.

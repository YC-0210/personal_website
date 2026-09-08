-- The Projects policies referred to each other, and Postgres refused the pair.
--
-- As written one migration ago, `projects` admitted a row if `daylog_entries`
-- held a published Entry for it, and `daylog_entries` admitted a row if its
-- `projects` row was live. Both of those reads are themselves under RLS, so
-- evaluating either policy re-entered the other:
--
--   ERROR: 42P17: infinite recursion detected in policy for relation "projects"
--
-- on *every* read, for the Owner as much as for a Visitor. The Projects section
-- could not load at all.
--
-- Nothing in the test suite could have caught it. The store tests run against
-- an in-memory fake and the browser tests stub Supabase, so the only layer that
-- executes a real policy is the integration check — which is why this ticket
-- also adds one for the Project store.
--
-- The rule is unchanged and still correct: a Project is public once a day of it
-- is. What changes is how each half asks its question. A `security definer`
-- function runs as its owner, so the read inside it does not re-enter the other
-- table's policies, and the cycle is broken at exactly one point.
--
-- Two details that are not incidental:
--
-- `search_path` is pinned on both. A `security definer` function that resolves
-- its table names through the caller's search path is the textbook way this
-- kind of helper becomes a privilege escalation.
--
-- They live in `private`, not `public`. PostgREST publishes every function in
-- its exposed schemas at /rest/v1/rpc/..., so in `public` these would let
-- anyone ask "is there a live Project with this id" and get a straight answer.
-- `private` is not exposed, so they stay callable from inside a policy — which
-- needs USAGE on the schema and EXECUTE on the function, both granted here —
-- and are absent from the API.

create schema if not exists private;

grant usage on schema private to anon, authenticated;

create or replace function private.project_is_live(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where projects.id = project and projects.deleted_at is null
  );
$$;

create or replace function private.project_has_published_entry(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.daylog_entries
    where daylog_entries.project_id = project
      and daylog_entries.published_at is not null
  );
$$;

grant execute on function private.project_is_live(uuid) to anon, authenticated;
grant execute on function private.project_has_published_entry(uuid) to anon, authenticated;

drop policy if exists "Projects with published work are publicly readable" on public.projects;
drop policy if exists "Published Entries of live Projects are publicly readable" on public.daylog_entries;
drop policy if exists "Bondings of readable Projects are publicly readable" on public.project_bondings;

-- `deleted_at` is still read straight off the row: it is on the table the
-- policy is for, so it costs nothing and needs no indirection. Only the
-- cross-table half goes through a function.
create policy "Projects with published work are publicly readable"
  on public.projects for select
  to anon
  using (
    deleted_at is null
    and private.project_has_published_entry(id)
  );

create policy "Published Entries of live Projects are publicly readable"
  on public.daylog_entries for select
  to anon
  using (
    published_at is not null
    and private.project_is_live(project_id)
  );

create policy "Bondings of readable Projects are publicly readable"
  on public.project_bondings for select
  to anon
  using (
    private.project_is_live(project_id)
    and private.project_has_published_entry(project_id)
  );

-- Belt and braces for the one database that ran an interim version of this fix
-- with the helpers in `public`. A fresh database never had them, and
-- `if exists` makes that a no-op rather than an error.
drop function if exists public.project_is_live(uuid);
drop function if exists public.project_has_published_entry(uuid);

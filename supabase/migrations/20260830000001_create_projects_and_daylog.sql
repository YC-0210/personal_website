-- Projects and the Daylog: the raw record of the work (issue #35).
--
-- A Project is a body of the Owner's work. Its Daylog is the dated record of
-- doing it — kept apart from the Articles on purpose: an Article is finished
-- writing, a Daylog Entry is not.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  -- The Trash. Months of logged work is not something to lose to one click, so
  -- deleting marks rather than removes — the same rule an Article carries.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately no `published_at` on a Project.
--
-- Whether a Project is public is *derived*: it is readable once one live,
-- published Daylog Entry exists in it. A flag here would be a second answer to
-- the same question, free to drift out of step with the Entries — which is how
-- `hours_spent` failed, and #30 spent a whole ticket removing that.

create table public.daylog_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- A date, not a timestamptz: an Entry is about a *day*, and the time of day
  -- it was typed up is not information anybody wants. Set by the Owner, because
  -- Monday's session gets written up on Tuesday morning.
  entry_date date not null,
  -- Tiptap's own JSON document, as an Article's body is (ADR-0008, decision 8):
  -- markup the editor cannot produce is not stripped on the way in, it is not
  -- representable at all.
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No unique constraint on (project_id, entry_date). Two Entries may share a day
-- on purpose — you write in the morning and learn something else at night — and
-- a constraint here would fail mid-thought with text already typed. `created_at`
-- breaks the tie when the log is ordered.
create index daylog_entries_project_day_idx
  on public.daylog_entries (project_id, entry_date desc, created_at desc);

-- The read the Project policy below performs, once per Project.
create index daylog_entries_published_idx
  on public.daylog_entries (project_id)
  where published_at is not null;

create table public.project_bondings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  atom_id uuid not null references public.atoms (id) on delete cascade,
  -- Nullable, and this is the whole reason this is a second table rather than a
  -- polymorphic column on `bondings`. An Article's Bonding Name is `not null`
  -- with a non-blank check, because it has to say how the Atom feeds the
  -- argument. A Project's is optional: the work touched the topic, and
  -- demanding a sentence per link is Article-grade ceremony on a work log.
  -- One table for both would have made that a conditional constraint, which is
  -- to say no constraint at all.
  name text check (name is null or length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_bondings_unique_pair unique (project_id, atom_id)
);

-- Both directions are read: a Project lists its Atoms, an Atom lists its
-- Projects. The unique constraint already indexes `project_id` leftmost, so
-- only the Atom-first read needs one of its own.
create index project_bondings_atom_id_idx on public.project_bondings (atom_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger daylog_entries_set_updated_at
  before update on public.daylog_entries
  for each row execute function public.set_updated_at();

create trigger project_bondings_set_updated_at
  before update on public.project_bondings
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.daylog_entries enable row level security;
alter table public.project_bondings enable row level security;

-- A Project reaches a Visitor only once something in it has been published.
-- Enforced here rather than filtered by the client: a Project the Owner has
-- merely named is work that has not happened yet, and announcing it would be
-- ADR-0008's failure moved up a level.
create policy "Projects with published work are publicly readable"
  on public.projects for select
  to anon
  using (
    deleted_at is null
    and exists (
      select 1
      from public.daylog_entries
      where daylog_entries.project_id = projects.id
        and daylog_entries.published_at is not null
    )
  );

create policy "Projects are readable in full by the authenticated Owner"
  on public.projects for select
  to authenticated
  using (true);

create policy "Projects are writable by authenticated Owner"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

-- A draft day is refused outright, and so is every day of a trashed Project —
-- the same two-sided rule ADR-0008 set for a Draft Article.
create policy "Published Entries of live Projects are publicly readable"
  on public.daylog_entries for select
  to anon
  using (
    published_at is not null
    and exists (
      select 1
      from public.projects
      where projects.id = daylog_entries.project_id
        and projects.deleted_at is null
    )
  );

create policy "Daylog Entries are readable in full by the authenticated Owner"
  on public.daylog_entries for select
  to authenticated
  using (true);

create policy "Daylog Entries are writable by authenticated Owner"
  on public.daylog_entries for all
  to authenticated
  using (true)
  with check (true);

-- A Bonding is only readable if its Project is, by the policy above. Without
-- this the Atom's end would leak the existence and the Name of work that is
-- refused everywhere else — the same leak the `bondings` policy closes for a
-- Draft Article.
create policy "Bondings of readable Projects are publicly readable"
  on public.project_bondings for select
  to anon
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_bondings.project_id
        and projects.deleted_at is null
        and exists (
          select 1
          from public.daylog_entries
          where daylog_entries.project_id = projects.id
            and daylog_entries.published_at is not null
        )
    )
  );

create policy "Project Bondings are readable in full by the authenticated Owner"
  on public.project_bondings for select
  to authenticated
  using (true);

create policy "Project Bondings are writable by authenticated Owner"
  on public.project_bondings for all
  to authenticated
  using (true)
  with check (true);

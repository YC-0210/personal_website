-- Articles: the Owner's writing, published the moment it is saved (ADR-0006).
--
-- Deleting an Article stamps `deleted_at` rather than removing the row — the
-- Trash. The Owner can restore it or delete it for good; a Visitor never sees
-- it again either way, and that is enforced here rather than in the client.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_live_idx on public.articles (created_at desc)
  where deleted_at is null;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

-- A Visitor reads live Articles only. A trashed Article is not merely hidden by
-- the client — it never reaches them.
create policy "Live Articles are publicly readable"
  on public.articles for select
  to anon
  using (deleted_at is null);

-- The Owner reads everything, Trash included, and is the only one who writes.
create policy "Articles are readable in full by the authenticated Owner"
  on public.articles for select
  to authenticated
  using (true);

create policy "Articles are writable by authenticated Owner"
  on public.articles for all
  to authenticated
  using (true)
  with check (true);

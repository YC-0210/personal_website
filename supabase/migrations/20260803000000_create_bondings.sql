-- Bondings: an Article cites an Atom, and the Atom links back (issue #26).
--
-- The Name is the whole point — it says how *this* Atom feeds into *this*
-- Article — so it is `not null` with a non-blank check, the same shape the
-- Connection Explanation rule takes. One Article/Atom pair can be bonded once;
-- saying the same thing twice about the same pair is an edit, not a new bond.

create table public.bondings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  atom_id uuid not null references public.atoms (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bondings_unique_pair unique (article_id, atom_id)
);

-- Both directions are read: an Article lists its Atoms, an Atom lists its
-- Articles. The unique constraint already indexes `article_id` leftmost, so
-- only the Atom-first read needs one of its own.
create index bondings_atom_id_idx on public.bondings (atom_id);

create trigger bondings_set_updated_at
  before update on public.bondings
  for each row execute function public.set_updated_at();

alter table public.bondings enable row level security;

-- A Bonding is only readable if its Article is. A Visitor cannot see into the
-- Trash, so a trashed Article's bonds stop reaching them here rather than being
-- filtered out by the client afterwards.
create policy "Bondings of live Articles are publicly readable"
  on public.bondings for select
  to anon
  using (
    exists (
      select 1
      from public.articles
      where articles.id = bondings.article_id
        and articles.deleted_at is null
    )
  );

create policy "Bondings are readable in full by the authenticated Owner"
  on public.bondings for select
  to authenticated
  using (true);

create policy "Bondings are writable by authenticated Owner"
  on public.bondings for all
  to authenticated
  using (true)
  with check (true);

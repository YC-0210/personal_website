-- Knowledge Sphere core schema: Atoms and the Connections between them.
-- Connections are undirected and untyped: they carry a strength (0-1) and a
-- description, and they disappear when either endpoint Atom is deleted.

create extension if not exists pgcrypto;

create table public.atoms (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) > 0),
  description text not null default '',
  hours_spent numeric not null default 0 check (hours_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  from_atom_id uuid not null references public.atoms (id) on delete cascade,
  to_atom_id uuid not null references public.atoms (id) on delete cascade,
  strength numeric not null check (strength >= 0 and strength <= 1),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_endpoints_differ check (from_atom_id <> to_atom_id)
);

create index connections_from_atom_id_idx on public.connections (from_atom_id);
create index connections_to_atom_id_idx on public.connections (to_atom_id);

-- Connections are undirected, so A-B and B-A are the same Connection. Index the
-- endpoints in a canonical order so the pair can only be recorded once.
create unique index connections_unique_pair_idx on public.connections (
  (case when from_atom_id < to_atom_id then from_atom_id else to_atom_id end),
  (case when from_atom_id < to_atom_id then to_atom_id else from_atom_id end)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger atoms_set_updated_at
  before update on public.atoms
  for each row execute function public.set_updated_at();

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

-- The Sphere is public to read and writable only by the signed-in Owner.
alter table public.atoms enable row level security;
alter table public.connections enable row level security;

create policy "Atoms are publicly readable"
  on public.atoms for select
  to anon, authenticated
  using (true);

create policy "Atoms are writable by authenticated Owner"
  on public.atoms for all
  to authenticated
  using (true)
  with check (true);

create policy "Connections are publicly readable"
  on public.connections for select
  to anon, authenticated
  using (true);

create policy "Connections are writable by authenticated Owner"
  on public.connections for all
  to authenticated
  using (true)
  with check (true);

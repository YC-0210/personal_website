-- Seed ~50 Atoms and ~70 Connections for the frame-rate check in issue #22.
--
-- The agent sandbox is software-rendered, so the ~50-Atom claim from #14 and the
-- per-Atom Nameplate cost added in PR #20 can only be judged on real hardware.
-- This puts a Sphere of that size in front of you in one paste; run
-- `perf-50-atoms-teardown.sql` afterwards to take it all back out.
--
-- Run as the Owner (the SQL editor in the Supabase dashboard is already
-- authenticated), not as `anon` — the RLS write policies require it.
--
-- Every row is labelled `Perf probe NN` so the teardown can find them without
-- touching a real Atom. Do not rename them.

-- 50 Atoms. Rank comes from the Articles written about an Atom (issue #30), so
-- the spread is seeded further down, in Articles and Bondings — without them
-- every probe would render at the same size out on the shell and the layout
-- would never be asked to place anything.
insert into public.atoms (label, description)
select
  'Perf probe ' || lpad(n::text, 2, '0'),
  'Seeded for the issue #22 frame-rate check. Safe to delete.'
from generate_series(1, 50) as n;

-- Connections between them. Each Atom links to the next two, plus a long chord
-- every fifth Atom, giving 107 lines — denser than the real Sphere is likely to
-- be, which is the point: if this is smooth, the real one is.
with probe as (
  select id, substring(label from 12)::int as n
  from public.atoms
  where label like 'Perf probe %'
)
insert into public.connections (from_atom_id, to_atom_id, strength, description)
select
  near.id,
  far.id,
  round((0.2 + (near.n % 8) * 0.1)::numeric, 2),
  'Seeded for the issue #22 frame-rate check. Safe to delete.'
from probe as near
cross join (values (1), (2)) as s(step)
join probe as far on far.n = near.n + s.step
on conflict do nothing;

-- The chords: every fifth Atom reaches back across the Sphere, so the layout has
-- long lines to settle as well as short ones.
with probe as (
  select id, substring(label from 12)::int as n
  from public.atoms
  where label like 'Perf probe %'
)
insert into public.connections (from_atom_id, to_atom_id, strength, description)
select
  near.id,
  far.id,
  0.85,
  'Seeded for the issue #22 frame-rate check. Safe to delete.'
from probe as near
join probe as far on far.n = near.n / 5
where near.n % 5 = 0 and near.n / 5 <> near.n
on conflict do nothing;

-- The Rank spread, in the unit Rank is now counted in: Articles.
--
-- 6 Articles is the moon cap, so the probes are banded evenly across 0 to 6:
-- probe 01 is written about not at all, probe 50 six times, and the bands in
-- between land on ranks 0, 0.36, 0.57, 0.71, 0.83, 0.92 and 1 — the whole log
-- curve, rather than every Atom clustering at one size.
insert into public.articles (title, body, published_at)
select
  'Perf probe article ' || lpad(n::text, 2, '0'),
  '{"type": "doc", "content": []}'::jsonb,
  now() - (n || ' days')::interval
from generate_series(1, 6) as n;

with probe as (
  select id, substring(label from 12)::int as n
  from public.atoms
  where label like 'Perf probe %'
),
written as (
  -- How many Articles each probe is written about: 0 at the bottom of the
  -- Sphere up to 6 at the top, in seven even bands of Atoms.
  select id, least(6, (n - 1) / 7) as articles
  from probe
)
insert into public.bondings (article_id, atom_id, name)
select art.id, written.id, 'Seeded for the issue #22 frame-rate check. Safe to delete.'
from written
join generate_series(1, 6) as k on k <= written.articles
join public.articles art
  on art.title = 'Perf probe article ' || lpad(k::text, 2, '0')
on conflict do nothing;

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

-- 50 Atoms, Rank spread across the whole log curve so the layout has both
-- centre-heavy and far-orbit Atoms to place, and Nameplates at every size.
insert into public.atoms (label, description, hours_spent)
select
  'Perf probe ' || lpad(n::text, 2, '0'),
  'Seeded for the issue #22 frame-rate check. Safe to delete.',
  -- 4 hours up to ~4300, geometric, so the log Rank curve is exercised end to
  -- end rather than clustering every Atom at one size.
  round((4 * power(1.15, n))::numeric, 1)
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

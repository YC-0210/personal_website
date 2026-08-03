-- Undo `perf-50-atoms.sql`.
--
-- Connections cascade off `atoms.id`, so removing the Atoms removes every line
-- that was seeded with them. Nothing else is touched: the `label like` filter
-- only matches the seeded rows, and a real Atom would have to be named
-- "Perf probe …" to be caught by it.

delete from public.atoms where label like 'Perf probe %';

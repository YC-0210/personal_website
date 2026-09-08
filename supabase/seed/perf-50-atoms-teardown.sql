-- Undo `perf-50-atoms.sql`.
--
-- Connections cascade off `atoms.id` and Bondings off both ends, so removing
-- the Atoms and the Articles removes every row that was seeded with them.
-- Nothing else is touched: the `label like` / `title like` filters only match
-- the seeded rows, and a real Atom or Article would have to be named
-- "Perf probe …" to be caught by them.

delete from public.atoms where label like 'Perf probe %';
delete from public.articles where title like 'Perf probe article %';

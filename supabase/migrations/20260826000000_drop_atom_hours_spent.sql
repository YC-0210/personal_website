-- Time spent stops being how an Atom earns its weight on the Sphere (issue #30).
--
-- `hours_spent` drove two readings: how many moons an Atom carries, and its
-- Rank — its size and its orbit depth (ADR-0003). Both now come from the
-- Articles written about the Atom, counted through `bondings`. That count is
-- evidence a reader can follow; a number typed into a form is not, and nothing
-- else in the site ever checked it.
--
-- Dropped outright rather than left nullable or defaulted. There is no
-- successor column and nothing to migrate into one: the replacement signal is
-- already recorded, in `bondings` joined to `articles`.
--
-- Rank is derived in the client rather than here — the Sphere is handed the
-- count (see ADR-0003 as amended), and `bondings` already has the index that
-- read needs.

alter table public.atoms
  drop column hours_spent;

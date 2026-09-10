-- The Learning State is retired. An Atom no longer says whether the Owner is
-- done with it.
--
-- `learning_state` had one job: it set the colour of an Atom's moons — lavender
-- while a topic was still being worked through, green once it was finished.
-- Every moon is now lavender, so nothing reads this column.
--
-- Why it goes rather than staying as a note nobody draws: it was a judgement
-- the Owner set by hand and nothing else in the site ever checked, which is the
-- same objection that removed `hours_spent` one migration ago. It also asked a
-- question the Sphere cannot honestly answer — a topic is not finished, and
-- marking one "learned" made a claim the Owner would have had to keep
-- maintaining across every Atom, forever, or let quietly rot.
--
-- Dropped outright: not nullable, not defaulted, no successor column. The
-- account of what was learned moves to the Project Daylog, which is written
-- rather than toggled.

alter table public.atoms
  drop column learning_state;

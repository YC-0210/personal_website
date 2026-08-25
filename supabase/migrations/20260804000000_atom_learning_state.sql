-- Where the Owner is with an Atom: still working through it, or done with it.
--
-- Not Rank. Rank is derived from `hours_spent` and says how much went in; this
-- is a judgement the Owner makes, and a topic can carry a thousand hours and
-- still be ongoing. The Sphere draws them differently — Rank sets an Atom's
-- size and how many moons it carries, this sets what colour those moons are.
--
-- `not null default 'ongoing'` so every existing Atom gets a value without a
-- backfill, and so a row can never be written without saying where it stands.
-- The client normalises unknown values to 'ongoing' as well; the check
-- constraint is what stops them being written in the first place.

alter table public.atoms
  add column learning_state text not null default 'ongoing'
    check (learning_state in ('ongoing', 'learned'));

-- The Sphere reads every Atom on load and colours the moons per state, so this
-- is only worth an index if the Owner ever filters by it. Deliberately none.

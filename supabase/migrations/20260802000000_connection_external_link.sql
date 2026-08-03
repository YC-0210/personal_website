-- A Connection has to explain itself: a written description, an External Link,
-- or both. The store refuses one with neither and turns the refusal into a
-- sentence; this is the same rule in the schema, so it holds however the row
-- got there.

alter table public.connections
  add column external_link text;

alter table public.connections
  add constraint connections_need_an_explanation check (
    length(trim(description)) > 0
    or length(trim(coalesce(external_link, ''))) > 0
  );

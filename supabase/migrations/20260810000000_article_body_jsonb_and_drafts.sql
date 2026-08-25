-- Two changes to an Article, both from #28: what its body *is*, and whether the
-- world can read it yet.
--
-- 1. The body becomes Tiptap's JSON document rather than text (decision 8).
--    Safety by construction: what a document may contain is decided by the
--    extensions the editor enables, so markup a paste drags in from someone
--    else's page is not stripped on the way in — it is not representable.
--
-- 2. An Article gains a draft state, amending ADR-0006's publish-on-save. See
--    ADR-0008: autosave writes continuously, so a save that published would put
--    every half-written sentence in front of a Visitor.
--
-- The column is replaced outright rather than converted, because there are no
-- Articles — confirmed with the Owner (decision 9). No legacy read path is
-- built, and nothing here tries to parse an old string body into a document.

alter table public.articles
  drop column body;

alter table public.articles
  add column body jsonb not null
    default '{"type": "doc", "content": []}'::jsonb
    -- The one structural thing worth insisting on at this level: a body is a
    -- ProseMirror document, not an array or a bare string that happens to be
    -- valid JSON. Anything finer belongs to the extension set, not to Postgres.
    check (body->>'type' = 'doc');

-- Null while the Article is still being written. Independent of `deleted_at`:
-- an Article can be a draft in the Trash, or a published one in the Trash, and
-- every read has to say which side of both axes it wants.
alter table public.articles
  add column published_at timestamptz;

-- The Visitor's index is now over live *and* published rows, which is the only
-- set they can select from.
drop index if exists articles_live_idx;
create index articles_public_idx on public.articles (created_at desc)
  where deleted_at is null and published_at is not null;

-- A Visitor reads live, published Articles. A draft is not merely filtered out
-- by the client — like the Trash, it never reaches them.
drop policy "Live Articles are publicly readable" on public.articles;
create policy "Live published Articles are publicly readable"
  on public.articles for select
  to anon
  using (deleted_at is null and published_at is not null);

-- The Bonding policy already joins to its parent Article, so a draft's Bonding
-- has to fall with it. Without this the Bonding row still answers for an
-- anonymous reader, which leaks an Article's existence and its Name from the
-- Atom's end even though the Article itself is refused.
drop policy "Bondings of live Articles are publicly readable" on public.bondings;
create policy "Bondings of live published Articles are publicly readable"
  on public.bondings for select
  to anon
  using (
    exists (
      select 1
      from public.articles
      where articles.id = bondings.article_id
        and articles.deleted_at is null
        and articles.published_at is not null
    )
  );

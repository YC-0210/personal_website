-- Pictures in a Daylog Entry: a bucket to keep them in, and who may touch them.
--
-- A day of work is often best shown rather than described — a screenshot of the
-- thing that was broken, a plot that came out wrong — so the Daylog takes
-- pictures on the same terms the Articles do.
--
-- The rule is identical to `article-images`: the Owner writes, everyone reads,
-- 5 MB a file, and the same MIME list with SVG deliberately off it. A *second*
-- bucket rather than reusing the first, because a bucket is the unit an RLS
-- policy is written against — keeping the two apart is what would let a day's
-- pictures answer to a different rule later without rewriting an Article's.
-- Only this SQL is duplicated; one `SupabaseImageStore` serves both.
--
-- ADR-0010 carries over intact, and it carries over *exactly*: a Daylog Entry
-- has the same draft/published axis an Article has, so a picture inside an
-- unpublished day is reachable by anyone holding its URL even though the day
-- itself is not. What keeps it from being found is the same thing as before —
-- the path is `<entry-id>/<random uuid>.<ext>`, and nothing public emits it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'daylog-images',
  'daylog-images',
  true,
  5242880, -- 5 MB, the same number `MAX_IMAGE_BYTES` carries.
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
on conflict (id) do nothing;

create policy "Daylog Images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'daylog-images');

create policy "Daylog Images are writable by authenticated Owner"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'daylog-images');

create policy "Daylog Images are replaceable by authenticated Owner"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'daylog-images')
  with check (bucket_id = 'daylog-images');

create policy "Daylog Images are removable by authenticated Owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'daylog-images');

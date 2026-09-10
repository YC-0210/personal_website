-- Images in an Article: a bucket to keep them in, and who may touch it.
--
-- The Owner writes, everyone reads. That is the same rule the `articles` table
-- carries, with one difference worth stating plainly rather than discovering
-- later: this bucket is public, so an Image belonging to a *Draft* is fetchable
-- by anyone holding its URL, even though the Draft itself is not. What keeps a
-- Draft's Images from being found is that their paths are random — see
-- ADR-0010, which records that trade and why it was taken.
--
-- The size limit and the MIME list are declared here, not only in the client.
-- `refusalFor` in `src/articles/article-image.ts` is the near side of this, so
-- a bad file is refused before it is uploaded; this is what actually holds.
--
-- SVG is deliberately not on the list. Served from our own origin it is a
-- document that can carry script, not a picture.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
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

create policy "Article Images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'article-images');

create policy "Article Images are writable by authenticated Owner"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-images');

create policy "Article Images are replaceable by authenticated Owner"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-images')
  with check (bucket_id = 'article-images');

create policy "Article Images are removable by authenticated Owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-images');

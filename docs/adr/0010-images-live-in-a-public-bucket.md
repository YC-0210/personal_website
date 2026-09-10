# ADR-0010: Images live in a public bucket, under unguessable paths

- **Status**: Accepted
- **Date**: 2026-09-03
- **Extended**: 2026-09-10 — the Daylog takes pictures on these same terms

## Context

Decision 3 on #28 kept images out of the writing surface on the grounds that
they need "a Storage bucket, an upload path, RLS and size limits, and that is
its own ticket". This is that ticket, and the only part of it that is a real
decision rather than plumbing is **who can fetch a picture**.

Everything else follows: the bucket declares a 5 MB limit and a MIME list, RLS
gives select to everyone and insert/update/delete to the authenticated Owner,
and `refusalFor` is the near side of the same rule so a bad file is refused
before it is uploaded rather than after.

The hard part is that ADR-0008 gave an Article two states, and `CONTEXT.md` is
emphatic about what the private one means: a Draft "never reaches a Visitor,
and that is enforced by the database rather than by the client". An Image
belonging to a Draft is a file in a bucket, not a row behind an RLS policy, and
those two things cannot be made to agree cheaply.

Three ways to make them agree were considered.

- **A private bucket, read through signed URLs.** The strongest answer, and it
  keeps a Draft's Images as private as its words. It costs the most everywhere
  else: a signed URL expires, so a *published* Article's pictures have to be
  re-signed on every read, they cannot be cached by a CDN or a browser for
  longer than the signature lasts, and a stored document would hold a URL that
  stops working — meaning the body could no longer hold the src at all, and
  every read path would have to re-derive it.
- **A private bucket that turns public on publish.** Moves every object when an
  Article is published, which makes publishing a step that can half-fail, and
  invalidates every src already written into the body.
- **A public bucket, with a random path per Image.** What every comparable
  system does. A Draft's picture is fetchable by anyone *holding* its URL, and
  the URL contains a v4 uuid, so it cannot be found by guessing from the
  Article's id or from anything else on the page.

## Decision

**The `article-images` bucket is public, and each Image is stored at
`<article-id>/<random uuid>.<ext>`.**

The Draft invariant is deliberately weakened, and it is worth being exact about
how far. A Draft's *existence*, its title, its words and its Bondings are still
refused to a Visitor by RLS, unchanged. What is now reachable is the bytes of a
picture inside one, to someone who already has its full URL. Nothing on the
public site ever emits that URL, because nothing on the public site emits the
Draft.

The random name does a second job worth naming: uploading `diagram.png` twice
must not have the second silently replace the first, which a
name-derived path would.

The extension is derived from the file's MIME type, never from the name it
arrived with — a name is whatever the uploader typed, and the two must not be
able to disagree.

SVG is not on the MIME list. Served from our own origin it is a document that
can carry script, so it would be stored XSS rather than a picture. For the same
reason `allowBase64` is off in the editor and `imageInNode` draws only `http(s)`
sources: a `data:` src is how markup smuggles itself past a check that looked
only at the node type.

## Consequences

- A picture in a Draft is not as private as the Draft. If that ever becomes
  unacceptable — a Draft holding something genuinely sensitive rather than
  merely unfinished — the private-bucket option above is the way out, and the
  cost of taking it is re-signing on read.
- Published Articles get the good half of the trade: pictures are plain public
  URLs, cacheable forever, because the path is unique per upload.
- Nothing deletes an Image when the Article referencing it is emptied from the
  Trash. Orphaned objects accumulate in the bucket. That is deliberate for now —
  a body can reference the same picture more than once and the Trash is
  reversible, so reference-counting is its own ticket rather than a line here.

## Extension: the Daylog, 2026-09-10

A day of work is often better shown than described — a screenshot of the thing
that broke, a plot that came out wrong — so a Daylog Entry now takes pictures
too. **Every argument above carries over unchanged**, and it carries over
exactly rather than by analogy: an Entry has the same draft/published axis an
Article has, so the same sentence is true of it. A picture inside an
unpublished day is reachable by anyone holding its URL, even though the day
itself is refused by RLS; what keeps it from being *found* is that the path is
`<entry-id>/<random uuid>.<ext>` and nothing public ever emits it.

**A second bucket, `daylog-images`, rather than reusing the first.** The rules
are identical today. The reason to keep them apart is that a bucket is the unit
an RLS policy is written against, so two buckets is what would let a day's
pictures answer to a different rule later — a shorter retention, say, or a
private one — without touching an Article's. The cost is real but small and
confined: only the SQL is duplicated. One `SupabaseImageStore`, parameterised by
bucket name, serves both, as do one size limit, one MIME list, one path rule and
one renderer.

Reusing `article-images` was the alternative, and it was rejected on the name
alone: a day's screenshot filed in a bucket called "article images" is a lie in
the schema that every later reader has to work around. Renaming both to
something neutral was considered and rejected as the more expensive answer to
the same problem — it moves existing objects for a cosmetic gain.

The orphan consequence above now applies twice over: nothing deletes a picture
when the Entry referencing it is deleted, exactly as nothing does for an
Article. Still one ticket, now covering two buckets.

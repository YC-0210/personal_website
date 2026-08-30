# Personal Website

A personal site whose homepage is an interactive visualization of the owner's knowledge, plus (in future rounds) the rest of the site around it.

## Language

**Atom**:
A single knowledge point, rendered as a node floating around the Sphere. Has a label and a description. Its Rank is not stored on it — it is earned, from the Articles written about it.
_Avoid_: node, skill, entry, topic.

**Connection**:
A weighted, undirected link between two Atoms. Carries a Strength (0–1) and a description of the relationship between them.
_Avoid_: edge, link, relationship.

**Strength**:
A 0–1 value on a Connection describing how strongly two Atoms relate to each other.
_Avoid_: weight, score.

**Rank**:
An Atom's visual weight — its size and orbit depth — derived from how many Articles have been written about that knowledge point. More writing means a bigger Atom positioned closer to the Sphere's center. Counted off live, published Bondings only, so the Sphere reads the same for the Owner as for a Visitor.
_Avoid_: level, score, weight.

**Sphere**:
The invisible bounding surface around which Atoms are arranged. Never rendered itself — only the Atoms and Connections are visible.
_Avoid_: globe, orb.

**Owner**:
The single authenticated user — the site's owner — who can enter Edit Mode. There is no public sign-up; only one Owner account exists.
_Avoid_: admin, author.

**Edit Mode**:
The authenticated state of the page in which the Owner can create, edit, and delete Atoms and Connections directly on the same screen visitors see. Changes made in Edit Mode apply live immediately — there is no separate draft/publish step for an Atom or a Connection. Articles are the one exception: writing is drafted privately and published deliberately, because autosave would otherwise publish every half-formed sentence. See ADR-0008.
_Avoid_: admin panel, dashboard, CMS.

**Visitor**:
Anyone viewing the site who is not the Owner. Visitors can orbit the Sphere, select Atoms, and follow Connections, but cannot modify anything.
_Avoid_: user, guest.

**Dossier**:
The full detail view of the selected Atom — its description and every Connection leaving it, each described in terms of the knowledge that links the two Atoms.
_Avoid_: detail panel, modal, popup.

**Compact Bar**:
The lean single-line summary of the selected Atom (label, Connection count) shown on small viewports in place of the full Dossier, leaving the Sphere visible. Opening it leads to the Dossier.
_Avoid_: mini panel, toast, snackbar.

**Nameplate**:
An Atom's label rendered beside its node in the Sphere, always visible, scaled with Rank and dimmed with the selection's emphasis.
_Avoid_: tag, tooltip, caption.

**Moon**:
A small body orbiting inside an Atom, carrying what has been written about it: one moon per live, published Article bonded to that Atom, up to six. Every moon is the same colour; the count is the whole reading.
_Avoid_: dot, orb, satellite, ring.

**Explanation**:
What a Connection says about the two Atoms it joins — a written description, an
External Link, or both. A Connection cannot be saved without one; a line with no
knowledge on it is not a Connection.
_Avoid_: note, comment, caption.

**External Link**:
The linked half of an Explanation: a URL to the thing that connects two Atoms —
a paper, a repository, a post. Validated as URL-shaped before it saves.
_Avoid_: reference, source, citation.

**Article**:
A piece of the Owner's writing, written as a Draft and then published
deliberately. Its body is a rich document — headings, quotes, lists, links —
not a block of plain text. Lives on the Articles page, apart from the Sphere.
_Avoid_: post, blog, entry, note.

**Draft**:
An Article that has been written but not published. Only the Owner can read one,
and that is enforced by the database rather than by the client — a Draft never
reaches a Visitor, by the Articles list or through an Atom's Dossier. Autosave
writes to the Draft continuously; publishing is a separate act. Marked with a
lavender `▶ Draft` badge beside the title.
_Avoid_: unpublished, private, WIP, pending.

**Bonding**:
A link between an Atom and a piece of the Owner's work — an Article or a
Project. Read in both directions: the Atom's Dossier lists what is bonded to it,
and the work lists the Atoms it draws on. Each pair bonds once.
An Article's Bonding carries a **Name** saying how that Atom feeds into that
Article — "How classical physics connects to economics" — and cannot be saved
without one. A Project's Name is optional: the work touched the topic, and that
is enough to say.
_Avoid_: citation, tag, reference, backlink.

**Project**:
A body of the Owner's work, holding a Daylog. Bonds to Atoms, optionally, and
those bonds are read from the Atom's end only — no line is drawn in the Sphere,
and a Project never changes an Atom's Rank or its moons. Reaches a Visitor only
once one Daylog Entry in it has been published; before that it is the Owner's
alone. Distinct from an Article: an Article is finished, a Project is underway.
_Avoid_: repo, work, portfolio piece, case study.

**Daylog**:
The dated record of doing a Project — what was worked through, and when. Raw
where an Article is composed. Read newest day first.
_Avoid_: journal, changelog, diary, timeline.

**Daylog Entry**:
One day of a Daylog: a date and a body, and no title — the date is the heading.
Dated by the Owner rather than by when it was typed, so a Monday written up on
Tuesday is still filed under Monday. Two may share a date. Written as a draft
and published deliberately, exactly as an Article is.
_Avoid_: log, post, note, standup.

**Trash**:
Where a deleted Article or Project waits. Independent of whether it was a Draft — an
Article can be a Draft in the Trash, or a published one. Deleting marks the
record rather than removing it — it leaves the public list at once, and the
Owner can restore it. A single Daylog Entry has no Trash: it is deleted
outright, because the Trash is there to protect months of work rather than one
day of it.
_Avoid_: archive, bin, recycle.

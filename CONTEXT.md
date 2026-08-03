# Personal Website

A personal site whose homepage is an interactive visualization of the owner's knowledge, plus (in future rounds) the rest of the site around it.

## Language

**Atom**:
A single knowledge point, rendered as a node floating around the Sphere. Has a label, a description, and a time-spent value that determines its Rank.
_Avoid_: node, skill, entry, topic.

**Connection**:
A weighted, undirected link between two Atoms. Carries a Strength (0–1) and a description of the relationship between them.
_Avoid_: edge, link, relationship.

**Strength**:
A 0–1 value on a Connection describing how strongly two Atoms relate to each other.
_Avoid_: weight, score.

**Rank**:
An Atom's visual weight — its size and orbit depth — derived from the time spent on that knowledge point. Higher time spent means a bigger Atom positioned closer to the Sphere's center.
_Avoid_: level, score, weight.

**Sphere**:
The invisible bounding surface around which Atoms are arranged. Never rendered itself — only the Atoms and Connections are visible.
_Avoid_: globe, orb.

**Owner**:
The single authenticated user — the site's owner — who can enter Edit Mode. There is no public sign-up; only one Owner account exists.
_Avoid_: admin, author.

**Edit Mode**:
The authenticated state of the page in which the Owner can create, edit, and delete Atoms and Connections directly on the same screen visitors see. Changes made in Edit Mode apply live immediately — there is no separate draft/publish step.
_Avoid_: admin panel, dashboard, CMS.

**Visitor**:
Anyone viewing the site who is not the Owner. Visitors can orbit the Sphere, select Atoms, and follow Connections, but cannot modify anything.
_Avoid_: user, guest.

**Dossier**:
The full detail view of the selected Atom — its description and every Connection leaving it, each described in terms of the knowledge that links the two Atoms.
_Avoid_: detail panel, modal, popup.

**Compact Bar**:
The lean single-line summary of the selected Atom (label, hours, Connection count) shown on small viewports in place of the full Dossier, leaving the Sphere visible. Opening it leads to the Dossier.
_Avoid_: mini panel, toast, snackbar.

**Nameplate**:
An Atom's label rendered beside its node in the Sphere, always visible, scaled with Rank and dimmed with the selection's emphasis.
_Avoid_: tag, tooltip, caption.

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
A piece of the Owner's writing, published the moment it is saved. Lives on the
Articles page, apart from the Sphere.
_Avoid_: post, blog, entry, note.

**Bonding**:
A link between an Article and an Atom, carrying a Name that says how that Atom
feeds into that Article — "How classical physics connects to economics". An
Article can bond to many Atoms and an Atom can be bonded from many Articles;
each pair bonds once. Read in both directions: the Atom's Dossier lists the
Articles bonded to it, and the Article lists the Atoms it draws on.
_Avoid_: citation, tag, reference, backlink.

**Trash**:
Where a deleted Article waits. Deleting an Article marks it rather than removing
it — it leaves the public list at once, and the Owner can restore it or delete
it for good.
_Avoid_: archive, bin, recycle.

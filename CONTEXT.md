# Personal Website

A personal site whose homepage is an interactive visualization of the owner's knowledge, plus (in future rounds) the rest of the site around it.

## Language

**Atom**:
A single knowledge point, rendered as a node floating around the Sphere. Has a label, a description, and a time-spent value that determines its Rank.
_Avoid_: node, skill, entry, topic.

**Connection**:
A weighted, undirected link between two Atoms. Carries a Strength (0–1) and an Explanation of the relationship between them.
_Avoid_: edge, link, relationship.

**Explanation**:
What a Connection carries to justify itself: a written description, an External Link, or both. At least one of the two is required — a Connection cannot be saved with neither.
_Avoid_: notes, summary.

**External Link**:
A URL on a Connection's Explanation, pointing at outside material (an article, a paper, a reference) that explains how the two Atoms relate. Distinct from the in-app link between an Atom's Dossier and an Article.
_Avoid_: url (as a field label facing the Owner — `externalLink` is fine as the code identifier).

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

**Article**:
A piece of long-form writing the Owner publishes, persisted and live-edited the same way Atoms and Connections are — no separate draft/publish step. Deleting one marks it for the Trash rather than removing it outright; see Trash.
_Avoid_: post, blog entry, page.

**Bonding**:
A link from an Article to one of the Atoms it discusses, carrying a required Name describing how that specific Atom feeds into that specific Article (e.g. "How classical physics connects to economics"). One Article can hold a Bonding to several Atoms, each with its own Name; one Atom can be the subject of Bondings from several Articles.
_Avoid_: citation, reference, mention, link.

**Trash**:
Where a deleted Article goes instead of being removed outright — recoverable by the Owner until a separate, explicit permanent-delete action. Exists because Articles, unlike Atoms and Connections, have no version history to fall back on.
_Avoid_: recycle bin, archive.

**Dossier**:
The full detail view of the selected Atom — its description and every Connection leaving it, each described in terms of the knowledge that links the two Atoms.
_Avoid_: detail panel, modal, popup.

**Compact Bar**:
The lean single-line summary of the selected Atom (label, hours, Connection count) shown on small viewports in place of the full Dossier, leaving the Sphere visible. Opening it leads to the Dossier.
_Avoid_: mini panel, toast, snackbar.

**Nameplate**:
An Atom's label rendered beside its node in the Sphere, always visible, scaled with Rank and dimmed with the selection's emphasis.
_Avoid_: tag, tooltip, caption.

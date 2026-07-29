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

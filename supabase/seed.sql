-- Sample Atoms, Connections and Articles, so the Sphere has something to show
-- before the Owner has entered their own. Safe to delete wholesale:
--
--   delete from public.atoms;
--   delete from public.articles;
--
-- (Connections cascade with their endpoint Atoms, Bondings with either end.)
--
-- The Articles are not decoration. An Atom's moons count the Articles written
-- about it, and its Rank — its size and its orbit depth — comes from the same
-- number (issue #30), so a seed with no Articles renders a flat Sphere: every
-- Atom the same size, out on the shell, with no moons.

insert into public.atoms (label, description) values
  ('TypeScript',      'Types at the edges, inference in the middle.'),
  ('React',           'Components, state, and knowing when not to reach for it.'),
  ('Next.js',         'App router, server components, and the rendering boundary.'),
  ('Postgres',        'Relational modelling, indexes, and query plans.'),
  ('Three.js',        'Scene graphs, materials, and the render loop.'),
  ('CSS',             'Layout, cascade, and the parts people skip.'),
  ('Testing',         'Seams, fakes, and tests that survive a refactor.'),
  ('Git',             'Branching, rebasing, and recovering from mistakes.'),
  ('Supabase',        'Postgres with auth, RLS, and a client that fits.'),
  ('Accessibility',   'Semantics, focus order, and screen reader behaviour.'),
  ('Design systems',  'Tokens, surfaces, and keeping a UI coherent.'),
  ('Node.js',         'The event loop, streams, and the module story.'),
  ('Docker',          'Images, layers, and reproducible environments.'),
  ('Linear algebra',  'Vectors and matrices, mostly in service of graphics.'),
  ('GLSL',            'Shaders, and thinking one pixel at a time.'),
  ('SQL tuning',      'Reading plans and making slow queries fast.'),
  ('Rust',            'Ownership, borrowing, and fighting the compiler.'),
  ('Product design',  'Deciding what to build before building it.');

insert into public.connections (from_atom_id, to_atom_id, strength, description)
select a.id, b.id, c.strength, c.description
from (values
  ('TypeScript',     'React',           0.90, 'Typed props and hooks are most of the daily work.'),
  ('React',          'Next.js',         0.95, 'Next.js is the frame React sits in here.'),
  ('TypeScript',     'Next.js',         0.80, 'The whole app is typed end to end.'),
  ('Next.js',        'Supabase',        0.70, 'Data reaches the page through the Supabase client.'),
  ('Supabase',       'Postgres',        0.95, 'Supabase is Postgres with the edges filled in.'),
  ('Postgres',       'SQL tuning',      0.85, 'Tuning is where the schema knowledge pays off.'),
  ('React',          'CSS',             0.65, 'Styling components is inseparable from writing them.'),
  ('CSS',            'Design systems',  0.75, 'Tokens land as CSS custom properties.'),
  ('Design systems', 'Accessibility',   0.60, 'Contrast and focus states are design decisions.'),
  ('React',          'Accessibility',   0.55, 'Semantics get decided at the component level.'),
  ('Three.js',       'GLSL',            0.70, 'Custom materials mean writing shaders.'),
  ('Three.js',       'Linear algebra',  0.80, 'Every transform is a matrix.'),
  ('Three.js',       'React',           0.60, 'react-three-fiber renders the scene graph.'),
  ('TypeScript',     'Node.js',         0.70, 'Same language on both sides.'),
  ('Node.js',        'Docker',          0.45, 'Packaging the runtime for deploys.'),
  ('Testing',        'TypeScript',      0.60, 'Types remove a whole category of test.'),
  ('Testing',        'React',           0.50, 'Testing at the seam, not the markup.'),
  ('Git',            'Testing',         0.35, 'Green before you push.'),
  ('Product design', 'Design systems',  0.65, 'Deciding what to build shapes the system.'),
  ('Product design', 'Accessibility',   0.40, 'Who can use it is part of what it is.'),
  ('Rust',           'Linear algebra',  0.25, 'Mostly through graphics side projects.'),
  ('Docker',         'Postgres',        0.40, 'Running the database locally.')
) as c(from_label, to_label, strength, description)
join public.atoms a on a.label = c.from_label
join public.atoms b on b.label = c.to_label;


-- Published Articles, and the Bondings that say how each Atom feeds into them.
--
-- The spread is the point: the counts run from 5 down to 1 across the Atoms
-- below, and the rest of the Sphere sits at none. That exercises the log Rank
-- curve rather than seeding one flat band of Atoms.
insert into public.articles (title, body, published_at)
select
  c.title,
  jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', c.opening)
        )
      )
    )
  ),
  now() - (c.days_ago || ' days')::interval
from (values
  ('Typing the edges, inferring the middle',  'Where an annotation earns its keep, and where it just repeats the compiler.', 4),
  ('The rendering boundary',                  'Server components moved the question from when to fetch to where to fetch.', 11),
  ('Components that survive a refactor',      'Testing at the seam rather than the markup, and what that costs.', 19),
  ('Reading a query plan',                    'The plan is the only honest account of what the database is about to do.', 26),
  ('Scene graphs and the render loop',        'Everything on screen is a transform applied in an order you chose.', 33),
  ('Tokens all the way down',                 'A design system is a set of names that outlive the components using them.', 47),
  ('Focus order is a design decision',        'Who can use it is part of what it is, and it is decided long before the CSS.', 58)
) as c(title, opening, days_ago);

insert into public.bondings (article_id, atom_id, name)
select art.id, a.id, c.name
from (values
  ('Typing the edges, inferring the middle', 'TypeScript',      'Where inference stops and an annotation starts'),
  ('Typing the edges, inferring the middle', 'Testing',         'What types remove from the test suite'),
  ('The rendering boundary',                 'Next.js',         'Where the app router draws the line'),
  ('The rendering boundary',                 'React',           'What a server component is not'),
  ('The rendering boundary',                 'TypeScript',      'Typing across the boundary'),
  ('Components that survive a refactor',     'Testing',         'Testing at the seam, not the markup'),
  ('Components that survive a refactor',     'React',           'What a component owes its caller'),
  ('Components that survive a refactor',     'TypeScript',      'Types as the contract a test does not have to restate'),
  ('Reading a query plan',                   'Postgres',        'What the planner is actually telling you'),
  ('Reading a query plan',                   'SQL tuning',      'Turning a plan into an index'),
  ('Scene graphs and the render loop',       'Three.js',        'Why the graph is a tree and not a list'),
  ('Scene graphs and the render loop',       'Linear algebra',  'Every transform is a matrix'),
  ('Scene graphs and the render loop',       'React',           'What react-three-fiber reconciles'),
  ('Tokens all the way down',                'Design systems',  'Naming a colour so it can change'),
  ('Tokens all the way down',                'CSS',             'Where tokens land as custom properties'),
  ('Focus order is a design decision',       'Accessibility',   'Focus order as a decision, not a fallout'),
  ('Focus order is a design decision',       'Design systems',  'Where the system has to say something'),
  ('Focus order is a design decision',       'React',           'Semantics decided at the component level'),
  ('Focus order is a design decision',       'TypeScript',      'Typing an element you do not own'),
  ('Focus order is a design decision',       'Testing',         'Asserting an order a mouse never takes')
) as c(article_title, atom_label, name)
join public.articles art on art.title = c.article_title
join public.atoms a on a.label = c.atom_label;

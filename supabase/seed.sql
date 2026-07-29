-- Sample Atoms and Connections, so the Sphere has something to show before the
-- Owner has entered their own. Safe to delete wholesale:
--
--   delete from public.atoms;
--
-- (Connections cascade with their endpoint Atoms.)

insert into public.atoms (label, description, hours_spent) values
  ('TypeScript',      'Types at the edges, inference in the middle.',                1200),
  ('React',           'Components, state, and knowing when not to reach for it.',     950),
  ('Next.js',         'App router, server components, and the rendering boundary.',   620),
  ('Postgres',        'Relational modelling, indexes, and query plans.',              540),
  ('Three.js',        'Scene graphs, materials, and the render loop.',                310),
  ('CSS',             'Layout, cascade, and the parts people skip.',                  480),
  ('Testing',         'Seams, fakes, and tests that survive a refactor.',             400),
  ('Git',             'Branching, rebasing, and recovering from mistakes.',           360),
  ('Supabase',        'Postgres with auth, RLS, and a client that fits.',             180),
  ('Accessibility',   'Semantics, focus order, and screen reader behaviour.',         220),
  ('Design systems',  'Tokens, surfaces, and keeping a UI coherent.',                 260),
  ('Node.js',         'The event loop, streams, and the module story.',               430),
  ('Docker',          'Images, layers, and reproducible environments.',               150),
  ('Linear algebra',  'Vectors and matrices, mostly in service of graphics.',          90),
  ('GLSL',            'Shaders, and thinking one pixel at a time.',                    70),
  ('SQL tuning',      'Reading plans and making slow queries fast.',                  130),
  ('Rust',            'Ownership, borrowing, and fighting the compiler.',              60),
  ('Product design',  'Deciding what to build before building it.',                   200);

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

"use client";

import Link from "next/link";

import { longDay } from "@/projects/daylog-date";
import { getProjectStore, useProjects } from "@/projects/use-projects";

/**
 * The Projects bonded to one Atom, read from the Atom's end.
 *
 * **Read-only, deliberately** (#35, decision 14). `AtomArticles` next door
 * carries full inline management because #28 wanted an Article *started from*
 * an Atom; a Project is bonded once, when it starts, and the bond controls live
 * on the Project's own page. Read-only also keeps the Dossier from growing a
 * second Unbond/Delete pair beside the first — the slip #28 flagged.
 *
 * What this lists differs by reader, exactly as "WRITTEN ABOUT" does: a Project
 * with nothing published is refused to a Visitor by RLS and by the store's read
 * rule, so it does not appear here either. **None of it touches the Sphere's
 * shape** — a Project never adds a moon and never moves Rank (#35, decision 3),
 * which is what makes a reader-dependent count safe in this panel.
 */
export function AtomProjects({ atomId }: { atomId: string }) {
  useProjects();
  const store = getProjectStore();

  const bonded = store.bondedProjects(atomId);
  if (bonded.length === 0) return null;

  return (
    <>
      <p className="text-ink-tertiary mt-8 text-[13px] font-medium tracking-[0.4px]">
        WORKED ON · {bonded.length}
      </p>

      <div className="mt-2 flex flex-col">
        {bonded.map(({ project, bonding }) => {
          const lastLogged = store.lastLoggedOn(project.id);

          return (
            <div key={bonding.id} className="border-hairline border-t py-3">
              <Link
                href={`/projects/${project.id}`}
                className="group block"
              >
                <p className="text-ink group-hover:text-primary-hover text-sm font-medium">
                  {project.name}
                </p>
                {/* The Name is optional on a Project's Bonding, so this line is
                    genuinely absent rather than empty when it was not given. */}
                {bonding.name && (
                  <p className="text-ink-subtle mt-0.5 text-xs leading-relaxed">
                    {bonding.name}
                  </p>
                )}
                <p className="text-ink-tertiary mt-0.5 font-mono text-[11px] tabular-nums">
                  {lastLogged === null
                    ? "Nothing logged in public yet"
                    : `Last logged ${longDay(lastLogged) ?? lastLogged}`}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** ADR-0004 prototype chooser — throwaway. Removed before merge. */

import Link from "next/link";

const PROTOTYPES = [
  {
    href: "/proto/a",
    name: "A · Takeover",
    description:
      "Tap an Atom → Compact Bar. Opening it takes the whole screen: connected knowledge first, then the Atom's own description. Maximum reading room; the Sphere steps aside while you read.",
  },
  {
    href: "/proto/b",
    name: "B · Split",
    description:
      "Tap an Atom → Compact Bar. Opening it raises a half sheet; the Sphere stays live above it, so the lit Connections remain visible while you read what they mean.",
  },
  {
    href: "/proto/c",
    name: "C · In-scene",
    description:
      "Tap an Atom → Compact Bar. Opening it floats the knowledge descriptions as callouts along the lit Connections inside the Sphere itself — reading happens in 3D, no sheet at all.",
  },
];

export default function ProtoIndex() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        ADR-0004 PROTOTYPES
      </p>
      <h1 className="text-ink mt-2 text-[28px] font-semibold tracking-[-0.6px]">
        Mobile Dossier · three directions
      </h1>
      <p className="text-ink-subtle mt-2 text-sm leading-relaxed">
        All three share the agreed pieces: always-visible Nameplates on every
        Atom, and a Compact Bar on selection that keeps the Sphere clear. They
        differ in what opening the bar does. Best judged on a phone.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        {PROTOTYPES.map((prototype) => (
          <li key={prototype.href}>
            <Link
              href={prototype.href}
              className="border-hairline bg-surface-1 hover:bg-surface-2 block rounded-lg border p-5"
            >
              <span className="text-ink block text-lg font-medium">
                {prototype.name}
              </span>
              <span className="text-ink-subtle mt-1 block text-sm leading-relaxed">
                {prototype.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

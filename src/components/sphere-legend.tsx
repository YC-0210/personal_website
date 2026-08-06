"use client";

/**
 * The key to the moons: what their colour means.
 *
 * An Atom's moons say two things at once — how many there are is Rank (one per
 * 250 hours), and what colour they are is where the Owner stands with the
 * topic. The count reads on its own; the colour does not, so it gets a key.
 *
 * Sits in the Sphere's upper-right corner, under the Articles link. On desktop
 * it steps aside when an Atom is selected, because the Dossier takes that
 * corner outright; on a phone the Dossier is a bar along the bottom, so it can
 * stay. The swatches are the same two colours the moons are drawn in, which is
 * the only reason this is trustworthy.
 */
export function SphereLegend({ isDossierOpen }: { isDossierOpen: boolean }) {
  return (
    <div
      aria-label="What the colour of an Atom's moons means"
      className={`border-hairline bg-surface-1/90 fixed top-16 right-4 z-20 flex-col gap-2 rounded-lg border px-3 py-2.5 backdrop-blur max-md:top-4 ${
        isDossierOpen ? "hidden max-md:flex" : "flex"
      }`}
    >
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        MOONS
      </p>
      <Key colour="#27a644" label="Still learning" />
      <Key colour="#828fff" label="Learned" />
    </div>
  );
}

function Key({ colour, label }: { colour: string; label: string }) {
  return (
    <p className="text-ink-muted flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: colour }}
      />
      {label}
    </p>
  );
}

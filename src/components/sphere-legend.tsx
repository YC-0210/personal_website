"use client";

/**
 * The key to the moons: what they are counting.
 *
 * A moon used to say two things — how many there were was how much had been
 * written about the Atom, and what colour they were was the Owner's Learning
 * State. The colour is gone, so one reading is left, and it is the one nobody
 * can guess: moons are visibly countable, but nothing on the screen says what
 * the count is *of*.
 *
 * Sits in the Sphere's upper-right corner, under the Articles link. On desktop
 * it steps aside when an Atom is selected, because the Dossier takes that
 * corner outright; on a phone the Dossier is a bar along the bottom, so it can
 * stay.
 */
export function SphereLegend({ isDossierOpen }: { isDossierOpen: boolean }) {
  return (
    <div
      aria-label="What an Atom's moons mean"
      className={`border-hairline bg-surface-1/90 fixed top-16 right-4 z-20 flex-col gap-2 rounded-lg border px-3 py-2.5 backdrop-blur max-md:top-4 ${
        isDossierOpen ? "hidden max-md:flex" : "flex"
      }`}
    >
      <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
        MOONS
      </p>
      {/* What the count means. Said in words rather than with a swatch — there
          is no colour to sample for "one each", and a reader who can see the
          moons still cannot guess what they are counting. */}
      <p className="text-ink-subtle text-xs leading-relaxed">
        One per Article written about the Atom
      </p>
    </div>
  );
}

import type { Locator, Page } from "@playwright/test";

/**
 * A Sphere with enough in it to have Connections, Nameplates and a selection,
 * served to the browser in place of Supabase. Ids are plain strings rather than
 * uuids — nothing in the client cares, and they read better in a failure.
 */
export const ATOMS = [
  { id: "a1", label: "Classical physics", description: "Newton onwards." },
  { id: "a2", label: "Economics", description: "Borrowed mechanics." },
  { id: "a3", label: "Statistics", description: "The shared tool." },
];

export const CONNECTIONS = [
  { id: "c1", from_atom_id: "a1", to_atom_id: "a2", strength: 0.9, description: "Mechanics metaphor", external_link: null },
  { id: "c2", from_atom_id: "a2", to_atom_id: "a3", strength: 0.6, description: "Econometrics", external_link: null },
];

/** Bodies are Tiptap documents now, not strings — decision 8 on #28. */
const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

/**
 * One published Article and one Draft, both bonded to the same Atom. The pair is
 * the point: the Draft is what a Visitor must not reach by either read path.
 *
 * The stub does not enforce RLS — it hands out both rows to anyone, exactly as
 * it hands the Owner's rows to a Visitor. That is deliberate. What keeps the
 * Draft off a Visitor's screen *here* is the store's own read rule, so these
 * tests hold that rule rather than the database's identical one.
 */
export const ARTICLES = [
  {
    id: "art1",
    title: "On borrowed metaphors",
    body: doc("Economics took its mechanics from physics."),
    deleted_at: null,
    published_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "art2",
    title: "Half a thought",
    body: doc("Not finished yet."),
    deleted_at: null,
    published_at: null,
  },
];

export const BONDINGS = [
  { id: "b1", article_id: "art1", atom_id: "a1", name: "How classical physics connects to economics" },
  { id: "b2", article_id: "art2", atom_id: "a1", name: "What the draft owes this Atom" },
];

/** Answer every Supabase read from the fixtures above. No project, no secrets. */
export async function stubSupabase(page: Page): Promise<void> {
  await page.route("**/stub.supabase.co/**", (route) => {
    const url = route.request().url();
    const body = url.includes("/atoms")
      ? ATOMS
      : url.includes("/connections")
        ? CONNECTIONS
        : url.includes("/articles")
          ? ARTICLES
          : url.includes("/bondings")
            ? BONDINGS
            : [];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });
}

/**
 * Put the Owner's session in place before any script runs, so the page comes up
 * in Edit Mode. Supabase reads its session straight out of localStorage, and
 * the key is derived from the project ref in the URL — `stub`, here.
 */
export async function signInAsOwner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sb-stub-auth-token",
      JSON.stringify({
        access_token: "stub-access",
        refresh_token: "stub-refresh",
        token_type: "bearer",
        expires_in: 3600,
        // Far enough out that the client never tries to refresh it.
        expires_at: 4102444800,
        user: {
          id: "owner",
          email: "owner@example.com",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
  });
}

/**
 * The quote owns the first screen and the Sphere the next, and the Sphere's
 * controls only appear once it has the screen. Every check here is about the
 * Sphere, so they all start from there.
 */
export async function scrollToSphere(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  // One frame past the handoff threshold, so the fixed controls have mounted.
  await page.waitForFunction(() => window.scrollY > window.innerHeight * 0.6);
}

/**
 * Whether `locator` is the element the browser would actually hand a click at
 * its own centre — the question `toBeVisible` does not ask.
 *
 * An element covered by the Sphere's canvas is visible by every other measure:
 * it is in the DOM, it has a box, it has non-zero opacity, and it is painted
 * underneath something opaque. This is the check that tells the difference.
 */
export async function isTopmostAtItsCentre(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const topmost = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return topmost !== null && element.contains(topmost);
  });
}

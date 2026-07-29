import type { SphereSnapshot } from "./domain";

/**
 * Persistence seam for the Sphere store.
 *
 * The store never talks to Supabase directly — it talks to this. That keeps the
 * store's tests running against an in-memory fake, and keeps Supabase details
 * (column naming, error shapes) out of the domain.
 *
 * Only reads exist at the walking-skeleton stage; Owner writes arrive with the
 * Atom and Connection CRUD tickets.
 */
export interface SphereRepository {
  /** Load every Atom and Connection. */
  loadSnapshot(): Promise<SphereSnapshot>;
}

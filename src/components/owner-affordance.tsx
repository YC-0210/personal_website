"use client";

import { useEffect, useRef, useState } from "react";

import { getSphereStore, useSphere } from "@/sphere/use-sphere";

/**
 * The Owner's way in.
 *
 * A small mark in the corner that reads as a brand dot rather than an "edit"
 * affordance — a visitor has no reason to click it. Every surface, border and
 * radius below comes from DESIGN.md; lavender appears only on the focus ring
 * and the primary action, per its scarcity rule.
 */
export function OwnerAffordance() {
  const { isEditMode, owner, authError } = useSphere();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFormOpen) emailRef.current?.focus();
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFormOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFormOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const store = getSphereStore();

    setIsSubmitting(true);
    await store.signIn(
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
    );
    setIsSubmitting(false);

    // Once the Owner is in, the form has done its job. On a bad password it
    // stays open with the error showing.
    if (store.getState().isEditMode) setIsFormOpen(false);
  }

  if (isEditMode) {
    // On mobile the detail panel owns the bottom edge, so this hangs below
    // the view toggle instead.
    return (
      <div className="fixed bottom-4 left-4 flex items-center gap-3 text-xs max-md:top-16 max-md:bottom-auto">
        {/* The email is a desktop nicety; on a phone it costs the row its room. */}
        <span className="text-ink-subtle max-md:hidden">{owner?.email}</span>
        <button
          type="button"
          onClick={() => void getSphereStore().signOut()}
          className="border-hairline bg-surface-1 text-ink hover:bg-surface-2 rounded-md border px-3 py-1.5 font-medium"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Owner sign in"
        onClick={() => setIsFormOpen(true)}
        className="border-hairline bg-surface-1 hover:border-hairline-strong fixed bottom-4 left-4 h-6 w-6 rounded-full border transition-colors max-md:top-16 max-md:bottom-auto"
      >
        <span className="bg-ink-tertiary mx-auto block h-1.5 w-1.5 rounded-full" />
      </button>

      {isFormOpen && (
        <div
          className="fixed inset-0 grid place-items-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsFormOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-sign-in-heading"
            onSubmit={handleSubmit}
            className="border-hairline bg-surface-1 w-full max-w-80 rounded-lg border p-6"
          >
            <h2
              id="owner-sign-in-heading"
              className="text-ink mb-4 text-lg font-semibold tracking-tight"
            >
              Sign in
            </h2>

            <label className="text-ink-subtle mb-1 block text-xs" htmlFor="owner-email">
              Email
            </label>
            <input
              ref={emailRef}
              id="owner-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="border-hairline bg-surface-2 text-ink mb-3 w-full rounded-md border px-3 py-2 text-sm"
            />

            <label
              className="text-ink-subtle mb-1 block text-xs"
              htmlFor="owner-password"
            >
              Password
            </label>
            <input
              id="owner-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="border-hairline bg-surface-2 text-ink mb-4 w-full rounded-md border px-3 py-2 text-sm"
            />

            {authError && (
              <p role="alert" className="text-ink-muted mb-3 text-xs">
                {authError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-ink rounded-md px-3 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-on-primary hover:bg-primary-hover rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-60"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

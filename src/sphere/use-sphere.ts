"use client";

import { useEffect, useSyncExternalStore } from "react";

import { createSphereStore, type SphereState, type SphereStore } from "./store";
import { SupabaseAuthProvider } from "./supabase-auth-provider";
import { SupabaseSphereRepository } from "./supabase-repository";

let store: SphereStore | null = null;

/** The one Sphere store the page shares, created lazily in the browser. */
export function getSphereStore(): SphereStore {
  store ??= createSphereStore(
    new SupabaseSphereRepository(),
    new SupabaseAuthProvider(),
  );
  return store;
}

const SERVER_SNAPSHOT: SphereState = {
  status: "idle",
  atoms: [],
  connections: [],
  layout: {},
  selectedAtomId: null,
  error: null,
  owner: null,
  isEditMode: false,
  authError: null,
};

/**
 * Subscribe a component to the Sphere store, loading it on first mount.
 *
 * The store is the source of truth; components read this state and call store
 * operations, and never hold Sphere logic of their own.
 */
export function useSphere(): SphereState {
  const sphereStore = getSphereStore();

  const state = useSyncExternalStore(
    (listener) => sphereStore.subscribe(listener),
    () => sphereStore.getState(),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (sphereStore.getState().status === "idle") {
      void sphereStore.load();
    }
  }, [sphereStore]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void sphereStore.restoreSession().then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [sphereStore]);

  return state;
}

"use client";

import { useEffect, useSyncExternalStore } from "react";

import { SupabaseAuthProvider } from "@/sphere/supabase-auth-provider";
import {
  createProjectStore,
  type ProjectState,
  type ProjectStore,
} from "./project-store";
import { SupabaseProjectRepository } from "./supabase-project-repository";

let store: ProjectStore | null = null;

/** The one Project store the page shares, created lazily in the browser. */
export function getProjectStore(): ProjectStore {
  store ??= createProjectStore(
    new SupabaseProjectRepository(),
    new SupabaseAuthProvider(),
  );
  return store;
}

const SERVER_SNAPSHOT: ProjectState = {
  status: "idle",
  projects: [],
  entries: [],
  bondings: [],
  error: null,
  owner: null,
  isEditMode: false,
  writeError: null,
};

/**
 * Subscribe a component to the Project store, loading it on first mount — the
 * same arrangement `useSphere` and `useArticles` have, for the same reason: the
 * store is the source of truth and components hold no logic of their own.
 */
export function useProjects(): ProjectState {
  const projectStore = getProjectStore();

  const state = useSyncExternalStore(
    (listener) => projectStore.subscribe(listener),
    () => projectStore.getState(),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (projectStore.getState().status === "idle") {
      void projectStore.load();
    }
  }, [projectStore]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void projectStore.restoreSession().then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [projectStore]);

  return state;
}

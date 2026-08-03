"use client";

import { useEffect, useSyncExternalStore } from "react";

import { SupabaseAuthProvider } from "@/sphere/supabase-auth-provider";
import {
  createArticleStore,
  type ArticleState,
  type ArticleStore,
} from "./article-store";
import { SupabaseArticleRepository } from "./supabase-article-repository";

let store: ArticleStore | null = null;

/** The one Article store the page shares, created lazily in the browser. */
export function getArticleStore(): ArticleStore {
  store ??= createArticleStore(
    new SupabaseArticleRepository(),
    new SupabaseAuthProvider(),
  );
  return store;
}

const SERVER_SNAPSHOT: ArticleState = {
  status: "idle",
  articles: [],
  error: null,
  owner: null,
  isEditMode: false,
  writeError: null,
};

/**
 * Subscribe a component to the Article store, loading it on first mount — the
 * same arrangement `useSphere` has, for the same reason: the store is the
 * source of truth and components hold no logic of their own.
 */
export function useArticles(): ArticleState {
  const articleStore = getArticleStore();

  const state = useSyncExternalStore(
    (listener) => articleStore.subscribe(listener),
    () => articleStore.getState(),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (articleStore.getState().status === "idle") {
      void articleStore.load();
    }
  }, [articleStore]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void articleStore.restoreSession().then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [articleStore]);

  return state;
}

"use client";

import { useEffect, useSyncExternalStore } from "react";

import { recoverStaleSession } from "@/lib/session-recovery";
import { SupabaseAuthProvider } from "@/sphere/supabase-auth-provider";
import {
  createArticleStore,
  type ArticleState,
  type ArticleStore,
} from "./article-store";
import { SupabaseArticleRepository } from "./supabase-article-repository";
import { SupabaseImageStore, ARTICLE_IMAGES } from "./supabase-image-store";

let store: ArticleStore | null = null;

/**
 * The one Article store the page shares, created lazily in the browser.
 *
 * The repository is wrapped for stale-token recovery exactly as the Sphere's
 * is — autosave is the path that meets an expired token most often, because it
 * is the one that fires after the Owner has been away from the keyboard.
 */
export function getArticleStore(): ArticleStore {
  if (!store) {
    const auth = new SupabaseAuthProvider();
    store = createArticleStore(
      recoverStaleSession(new SupabaseArticleRepository(), () =>
        auth.refreshSession(),
      ),
      auth,
      // Uploading meets a stale token as readily as saving does, so the bucket
      // is wrapped the same way the table is.
      recoverStaleSession(new SupabaseImageStore(ARTICLE_IMAGES), () =>
        auth.refreshSession(),
      ),
    );
  }
  return store;
}

const SERVER_SNAPSHOT: ArticleState = {
  status: "idle",
  articles: [],
  bondings: [],
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

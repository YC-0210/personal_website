"use client";

import { useEffect } from "react";

import { getSphereStore } from "@/sphere/use-sphere";
import { getArticleStore, useArticles } from "./use-articles";

/**
 * The join between the two stores: it tells the Sphere how many Articles have
 * been written about each Atom, which is what an Atom's moons count and what
 * its Rank — its size and its orbit depth — is derived from (issue #30).
 *
 * It lives here, in the component layer, rather than in either store. Bondings
 * belong to the Article store (ADR-0007) and the Sphere needs the number rather
 * than the Bondings, so neither store reaches into the other; this hook is the
 * only thing that knows about both. It is the same arrangement `/articles/<id>`
 * already uses to put Atom labels on an Article's Bondings.
 *
 * Calling it also loads the Articles, which the Sphere page would otherwise
 * never do — without them every Atom would read as unwritten-about.
 */
export function useSphereArticleCounts(): void {
  const { articles, bondings } = useArticles();

  useEffect(() => {
    getSphereStore().setArticleCounts(
      getArticleStore().publishedBondedCounts(),
    );
  }, [articles, bondings]);
}

import type { ArticleBody, ArticleBodyNode } from "./domain";

/**
 * Reading a Tiptap document as words.
 *
 * There is deliberately no derived plain-text column behind this (decision 8 on
 * #28): `loadArticles` already pulls every body for the list, so the excerpt is
 * taken here rather than kept as a second copy of the same words that can drift
 * out of step with the first.
 */

/** What a draft starts as: a document with nothing in it yet. */
export const EMPTY_BODY: ArticleBody = { type: "doc", content: [] };

/**
 * A body of plain paragraphs. The shape Tiptap itself would produce for someone
 * typing prose and nothing else — used where the markup is beside the point.
 */
export function paragraphs(...texts: string[]): ArticleBody {
  return {
    type: "doc",
    content: texts.map((text) => ({
      type: "paragraph",
      content: text === "" ? [] : [{ type: "text", text }],
    })),
  };
}

/**
 * The words of an Article, in document order and stripped of their markup.
 *
 * Text inside one block runs together — the marks in "the equilibrium is *not*
 * a resting state" are formatting, not boundaries — while separate blocks are
 * separated by a space, so a heading never runs into the paragraph beneath it.
 */
export function excerptOf(body: ArticleBody): string {
  return collapse(textOf(body));
}

function textOf(node: ArticleBodyNode | ArticleBody): string {
  if ("text" in node && typeof node.text === "string") return node.text;

  const children = node.content ?? [];
  if (children.length === 0) return "";

  // Two text nodes are one run of prose; anything else is two blocks, and two
  // blocks need a gap or their last and first words fuse into one.
  const parts = children.map(textOf);
  const allInline = children.every((child) => typeof child.text === "string");
  return parts.join(allInline ? "" : " ");
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

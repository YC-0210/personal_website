import { describe, expect, it } from "vitest";

import { excerptOf } from "./article-body";
import type { ArticleBody } from "./domain";

/**
 * The body is a Tiptap document, not a string (decision 8 on #28), so an
 * excerpt cannot be the first N characters of anything. It is taken by walking
 * the document — which is also what makes a second, derived plain-text column
 * unnecessary.
 */

const borrowedMetaphors: ArticleBody = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Economics borrowed its mechanics." }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Where the borrowing starts" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The equilibrium is " },
        { type: "text", marks: [{ type: "em" }], text: "not" },
        { type: "text", text: " a resting state." },
      ],
    },
  ],
};

describe("An excerpt of an Article", () => {
  it("gathers the words across blocks, ignoring how they are marked up", () => {
    expect(excerptOf(borrowedMetaphors)).toBe(
      "Economics borrowed its mechanics. Where the borrowing starts The equilibrium is not a resting state.",
    );
  });

  it("keeps list items apart, however deeply the blocks nest", () => {
    // A bulletList holds listItems which hold paragraphs — three levels before
    // any text. If the walk only separated top-level blocks, the last word of
    // one bullet would fuse to the first word of the next.
    const withAList: ArticleBody = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Marginalism" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Equilibrium" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(excerptOf(withAList)).toBe("Marginalism Equilibrium");
  });

  it("does not break a word that a mark splits in two", () => {
    // Bolding the second half of a word splits it across two text nodes with no
    // space anywhere. Separating *those* would invent one: "equi librium".
    const splitWord: ArticleBody = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "equi" },
            { type: "text", marks: [{ type: "bold" }], text: "librium" },
          ],
        },
      ],
    };

    expect(excerptOf(splitWord)).toBe("equilibrium");
  });

  it("is empty for an Article nothing has been typed into yet", () => {
    expect(excerptOf({ type: "doc", content: [] })).toBe("");
  });
});

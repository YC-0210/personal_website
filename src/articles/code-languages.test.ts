import { describe, expect, it } from "vitest";

import {
  CODE_LANGUAGES,
  highlightJsNameOf,
  labelOfCodeLanguage,
  toCodeLanguage,
} from "./code-languages";

/**
 * What a code block can say it is written in (issue #32).
 *
 * The list is deliberately short — seven languages and Plain text — and it is
 * the single place the set is stated. Adding an eighth should be one entry here
 * and one `registerLanguage` in the highlighter; if it is ever more than that,
 * the seam is in the wrong place.
 */
describe("The languages a code block can be written in", () => {
  it("offers exactly the seven the site supports", () => {
    expect(CODE_LANGUAGES.map((language) => language.id)).toEqual([
      "c",
      "cpp",
      "python",
      "javascript",
      "html",
      "markdown",
      "java",
    ]);
  });

  it("names each one the way a writer would, not the way a parser would", () => {
    // What the Owner reads in the picker. `cpp` is not a language anyone calls
    // it, and the stored id is not what should be shown.
    expect(CODE_LANGUAGES.map((language) => language.label)).toEqual([
      "C",
      "C++",
      "Python",
      "JavaScript",
      "HTML",
      "Markdown",
      "Java",
    ]);
  });
});

describe("The name highlight.js knows a language by", () => {
  it("is usually the id itself", () => {
    expect(highlightJsNameOf("python")).toBe("python");
    expect(highlightJsNameOf("java")).toBe("java");
  });

  it("is `xml` for HTML, which is what highlight.js registers it as", () => {
    // The one place the two naming schemes disagree. The stored document keeps
    // our id — it is the record, and it should not encode a third party's
    // vocabulary — so the translation happens here and nowhere else.
    expect(highlightJsNameOf("html")).toBe("xml");
  });
});

describe("Reading the language off a stored block", () => {
  it("takes one of the seven at its word", () => {
    expect(toCodeLanguage("python")).toBe("python");
    expect(toCodeLanguage("cpp")).toBe("cpp");
  });

  it("reads a block with no language as plain text", () => {
    // Every code block written before #32 is in exactly this state, and must
    // keep rendering as it always has.
    expect(toCodeLanguage(null)).toBeNull();
    expect(toCodeLanguage(undefined)).toBeNull();
  });

  it("reads anything it does not recognise as plain text", () => {
    // The boundary where the attribute stops being trusted — the same rule
    // `toLearningState` and `atomIdFromHash` already apply. A hand-edited row,
    // or a language dropped from the list later, must not colour a block
    // wrongly or take the Article's page down.
    expect(toCodeLanguage("rust")).toBeNull();
    expect(toCodeLanguage("xml")).toBeNull();
    // The editor names this grammar to stop itself guessing (see
    // `PLAIN_TEXT_GRAMMAR`), so it is a value that genuinely reaches here —
    // and Plain text is exactly what it should read as.
    expect(toCodeLanguage("plaintext")).toBeNull();
    expect(toCodeLanguage("")).toBeNull();
    expect(toCodeLanguage(42)).toBeNull();
    expect(toCodeLanguage({ id: "python" })).toBeNull();
  });

  it("does not accept a language by the name highlight.js knows it as", () => {
    // `xml` is highlight.js's name for HTML and is not a language the Owner can
    // pick. Accepting it here would put a value in the document that the picker
    // cannot show and that nothing else in the site produces.
    expect(toCodeLanguage("xml")).toBeNull();
  });
});

describe("What the picker shows for a block", () => {
  it("names the language a block is in", () => {
    expect(labelOfCodeLanguage("cpp")).toBe("C++");
    expect(labelOfCodeLanguage("html")).toBe("HTML");
  });

  it("calls a block with no language Plain text, rather than nothing", () => {
    // Plain text is a real choice the Owner can make and come back to, not the
    // absence of one, so it is named rather than left blank.
    expect(labelOfCodeLanguage(null)).toBe("Plain text");
  });
});

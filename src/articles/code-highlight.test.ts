import { describe, expect, it } from "vitest";

import { editorLowlight, highlightCode } from "./code-highlight";

/** The code back out of the tokens, which must always be what went in. */
function textOf(code: string, language: Parameters<typeof highlightCode>[1]) {
  return highlightCode(code, language)
    .map((run) => run.text)
    .join("");
}

/** The token a given fragment of the code was classified as. */
function tokenOf(
  code: string,
  language: Parameters<typeof highlightCode>[1],
  fragment: string,
) {
  return highlightCode(code, language).find((run) =>
    run.text.includes(fragment),
  )?.token;
}

/**
 * Colouring a code block (issue #32).
 *
 * The highlighter hands back plain data — runs of text, each either carrying a
 * token name or not — rather than markup. That is the whole reason `lowlight`
 * was chosen over calling `highlight.js` directly: `hljs.highlight()` returns a
 * string of HTML, and rendering a string of HTML is the one thing decision 8 on
 * #28 exists to prevent. The reader turns these runs into React elements the
 * same way it turns the rest of the body into them.
 */
describe("Colouring a code block", () => {
  it("leaves a Plain text block as one uncoloured run", () => {
    const runs = highlightCode("int x = 1; // hi", null);

    expect(runs).toEqual([{ text: "int x = 1; // hi", token: null }]);
  });

  it("finds the comment and the literal in C", () => {
    const code = 'int x = 1; // counts\nchar *s = "hi";';

    expect(tokenOf(code, "c", "// counts")).toBe("comment");
    expect(tokenOf(code, "c", "1")).toBe("number");
    expect(tokenOf(code, "c", '"hi"')).toBe("string");
  });

  it("finds the keyword and the docstring-quote in Python", () => {
    const code = 'def greet(name):\n    # say it\n    return "hi " + name';

    expect(tokenOf(code, "python", "def")).toBe("keyword");
    expect(tokenOf(code, "python", "# say it")).toBe("comment");
    expect(tokenOf(code, "python", '"hi "')).toBe("string");
  });

  it("colours a nested token by the innermost thing known about it", () => {
    // A substitution inside a template string is the case: `highlight.js`
    // nests the spans, and the inner one is the more specific reading. Taking
    // the outer one would paint `${x}` as though it were part of the literal,
    // which is exactly what a reader is scanning the block to tell apart.
    const runs = highlightCode("const s = `a ${x} b`;", "javascript");

    expect(runs).toContainEqual({ text: "${x}", token: "subst" });
    // ...and the literal either side of it keeps its own token.
    expect(runs).toContainEqual({ text: "`a ", token: "string" });
    expect(runs).toContainEqual({ text: " b`", token: "string" });
  });

  it("tells the seven languages apart rather than guessing one for all", () => {
    // `class` is a keyword in Java and nothing in Markdown. If the language
    // were ignored — or detected — these two would agree, and they must not.
    expect(tokenOf("class Main {}", "java", "class")).toBe("keyword");
    expect(tokenOf("class Main {}", "markdown", "class")).toBeNull();
  });
});

describe("What the highlighter must never do", () => {
  it("gives back exactly the code it was given, in every language", () => {
    // The runs are concatenated straight into the page, so anything lost or
    // added here is lost or added from the Owner's writing. Checked per
    // language because each grammar walks the source differently.
    const samples = [
      ["c", '#include <stdio.h>\nint main(void) { return 0; } // done'],
      ["cpp", 'template <class T>\nT max(T a, T b) { return a > b ? a : b; }'],
      ["python", 'if x:\n\tprint("tabbed", end="")  # note the tab'],
      ["javascript", "const f = async () => `a ${1 + 2} b`;"],
      ["html", '<p class="x">a &amp; b</p>'],
      ["markdown", "# Title\n\n- one\n- two\n\n`code`"],
      ["java", "public class A { /* block */ int i = 0xFF; }"],
    ] as const;

    for (const [language, code] of samples) {
      expect(textOf(code, language), `${language} lost or gained text`).toBe(
        code,
      );
    }
  });

  it("keeps HTML source as text, tags and all", () => {
    // The case that makes the no-markup rule concrete. A `<script>` in an HTML
    // block is content the reader must see, and it stays a string from parsing
    // through to the page.
    const code = '<script>alert("x")</script>';

    expect(textOf(code, "html")).toBe(code);
    // And it is genuinely being parsed as HTML, not passed through untouched.
    expect(tokenOf(code, "html", "script")).not.toBeNull();
  });

  it("falls back to plain text for a language it does not have", () => {
    // `lowlight` throws on a grammar it was never given. `toCodeLanguage`
    // should already have refused this, so reaching here is a bug elsewhere —
    // and an uncoloured block is a better answer to it than a blank page.
    const runs = highlightCode("fn main() {}", "rust" as never);

    expect(runs).toEqual([{ text: "fn main() {}", token: null }]);
  });

  it("survives an empty block, in a language or without one", () => {
    // An empty block is nothing to draw, not one run of nothing. The reader
    // maps runs to elements, and an empty run is an empty span in the markup.
    expect(highlightCode("", "python")).toEqual([]);
    expect(highlightCode("", null)).toEqual([]);
  });
});

/**
 * What the editor is given to colour with.
 *
 * Tiptap's lowlight extension calls `highlightAuto()` whenever a block names a
 * language it does not recognise — including one the Owner never chose, like
 * the `rust` in a ```rust fence typed by hand. Guessing is decision 3 on #32
 * inverted, so the guess is taken away at the seam rather than patched out of
 * each path that can reach it: what the editor is handed simply has no way to
 * guess.
 */
describe("The highlighter the editor is handed", () => {
  it("knows the same languages the reader does", () => {
    // One registry behind both, so a language cannot exist in the editor and
    // not on the page.
    expect(editorLowlight.listLanguages()).toContain("python");
    expect(editorLowlight.listLanguages()).toContain("xml");
  });

  it("colours a named language exactly as the reader would", () => {
    const tree = editorLowlight.highlight("python", "# say it");

    expect(JSON.stringify(tree)).toContain("hljs-comment");
  });

  it("refuses to guess, and returns plain text instead", () => {
    // `# say it` is a comment in Python, a heading in Markdown and a
    // preprocessor line in C. Asked to guess, `highlight.js` picks one of them.
    // Asked here, it must pick none.
    const tree = editorLowlight.highlightAuto("# say it\nint x = 1;");

    expect(JSON.stringify(tree)).not.toContain("hljs-");
  });
});

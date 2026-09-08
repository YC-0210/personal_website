import { createLowlight } from "lowlight";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";

import { highlightJsNameOf, type CodeLanguageId } from "./code-languages";

/**
 * Colouring a code block (issue #32).
 *
 * `lowlight` rather than `highlight.js` directly, and that is a decision rather
 * than a preference: `hljs.highlight()` hands back a *string of markup*, and
 * the only way to put a string of markup on the page is the one thing decision
 * 8 on #28 exists to prevent. `lowlight` hands back a syntax tree, which this
 * flattens into plain data for the reader to build React elements from — the
 * same way the rest of the body is built.
 *
 * Seven grammars are registered, one per language the picker offers, plus
 * `plaintext`. Not `lowlight`'s `common` (37) or `all` (190): what the Owner
 * cannot write is not shipped to the reader, which is the argument the
 * extension set already makes.
 *
 * `plaintext` is not a language the picker offers and never appears in a run's
 * token. It is registered because it is what stops the editor *guessing*: see
 * `PLAIN_TEXT_GRAMMAR` below.
 */
/**
 * The one registry, shared with the editor's own lowlight extension so both
 * surfaces colour by the same grammars. Registering it twice would be two sets
 * of seven, and a language present in one and not the other.
 */
/**
 * What a block with no language is highlighted as.
 *
 * Tiptap's lowlight extension falls back to `highlightAuto()` when a block
 * names no language — it *guesses*, from whichever grammars happen to be
 * registered. That is decision 3 on #32 inverted: a wrong guess silently
 * mis-colours a block, and the Owner never asked for a colour at all.
 *
 * Naming a real but empty grammar as the default is what takes that path away.
 * `plaintext` is registered, so the extension highlights with it and produces
 * no tokens, and `highlightAuto()` is never reached — including for every block
 * written before #32, which carries a null language.
 */
export const PLAIN_TEXT_GRAMMAR = "plaintext";

export const lowlight = createLowlight();
lowlight.register({ c, cpp, java, javascript, markdown, plaintext, python, xml });

/**
 * One run of code, and what the grammar made of it.
 *
 * `token` is `highlight.js`'s class with its `hljs-` prefix taken off, so a run
 * reads as `comment` or `keyword` rather than carrying a CSS detail around. The
 * reader puts the prefix back when it builds the class name, where it belongs:
 * both surfaces then share one rule set and cannot drift apart on colour.
 *
 * `null` is code the grammar had no opinion about: whitespace, punctuation, an
 * ordinary identifier.
 */
export interface CodeRun {
  text: string;
  token: string | null;
}

/**
 * The code, in runs. Concatenating `text` across the runs always reproduces the
 * input exactly — they go straight onto the page, so anything lost here is lost
 * out of the Owner's writing.
 *
 * A block with no language, or one carrying a language this does not have,
 * comes back as a single uncoloured run. `toCodeLanguage` should have refused
 * the second case long before here, so reaching it means a bug elsewhere — and
 * an uncoloured block is a better answer to that than a page that throws.
 */
export function highlightCode(
  code: string,
  language: CodeLanguageId | null,
): CodeRun[] {
  if (code === "") return [];
  if (language === null) return [{ text: code, token: null }];

  let tree;
  try {
    tree = lowlight.highlight(highlightJsNameOf(language), code);
  } catch {
    return [{ text: code, token: null }];
  }

  const runs: CodeRun[] = [];
  collect(tree.children, null, runs);
  return runs;
}

/**
 * Walk the tree into flat runs, innermost token wins.
 *
 * `highlight.js` nests spans — a substitution inside a template string, an
 * escape inside a literal — and the innermost class is the most specific thing
 * known about that text, which is what should colour it.
 */
function collect(nodes: HastNode[], token: string | null, runs: CodeRun[]): void {
  for (const node of nodes) {
    if (node.type === "text") {
      if (node.value) runs.push({ text: node.value, token });
      continue;
    }
    if (node.type === "element") {
      collect(node.children ?? [], classOf(node) ?? token, runs);
    }
  }
}

/** The token name on a span, or null if it carries none we understand. */
function classOf(node: HastNode): string | null {
  const classes = node.properties?.className;
  if (!Array.isArray(classes)) return null;

  for (const candidate of classes) {
    if (typeof candidate === "string" && candidate.startsWith("hljs-")) {
      return candidate.slice("hljs-".length);
    }
  }
  return null;
}

/**
 * The shape of `lowlight`'s output, named locally rather than pulled in from
 * `@types/hast` — this reads two fields of it and nothing else.
 *
 * `type` is left open rather than a union of the two we handle: hast has other
 * node kinds (comments, raw), and a walk that only knows about text and
 * elements should ignore the rest rather than fail to compile against them.
 */
interface HastNode {
  type: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

/**
 * The highlighter the editor's lowlight extension is handed.
 *
 * Everything is the shared registry's, except the one thing this site does not
 * want: **it never guesses**. Tiptap's extension falls back to
 * `highlightAuto()` whenever a block names a language it does not recognise,
 * and a block can reach that state without the Owner ever choosing anything —
 * a ```rust fence typed by hand sets `rust`, which is not one of the seven.
 *
 * Taking the guess away here rather than patching each path that can reach it
 * means decision 3 on #32 holds by construction: a language the picker cannot
 * produce colours as Plain text, in the editor exactly as on the page.
 */
export const editorLowlight = {
  listLanguages: () => lowlight.listLanguages(),
  registered: (name: string) => lowlight.registered(name),
  highlight: (name: string, code: string) => lowlight.highlight(name, code),
  highlightAuto: (code: string) => lowlight.highlight(PLAIN_TEXT_GRAMMAR, code),
};

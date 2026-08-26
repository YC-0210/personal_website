/**
 * What a code block can say it is written in (issue #32).
 *
 * The one place the set is stated. Adding an eighth language is one entry here
 * and one `registerLanguage` in `code-highlight.ts` — if it is ever more than
 * that, the seam has moved to the wrong place.
 *
 * The set is deliberately small for the same reason the extension set in
 * `editor-extensions.ts` is: what the Owner cannot write is not shipped to the
 * reader. `lowlight`'s own bundles carry 37 languages (`common`) and 190
 * (`all`); this site produces seven.
 */

/**
 * The id stored on the block. Ours, not `highlight.js`'s — the document is the
 * record, and it should not encode a third party's vocabulary. `null` is Plain
 * text, which is also Tiptap's own default and therefore what every block
 * written before #32 already carries.
 */
export type CodeLanguageId =
  | "c"
  | "cpp"
  | "python"
  | "javascript"
  | "html"
  | "markdown"
  | "java";

export interface CodeLanguage {
  id: CodeLanguageId;
  /** What the Owner reads in the picker. Nobody calls the language "cpp". */
  label: string;
  /** What `highlight.js` registers it under, which is not always the id. */
  hljs: string;
}

/** What a block with no language is called. It is a choice, not a blank. */
export const PLAIN_TEXT_LABEL = "Plain text";

export const CODE_LANGUAGES: readonly CodeLanguage[] = [
  { id: "c", label: "C", hljs: "c" },
  { id: "cpp", label: "C++", hljs: "cpp" },
  { id: "python", label: "Python", hljs: "python" },
  { id: "javascript", label: "JavaScript", hljs: "javascript" },
  // The one place the two naming schemes part company: `highlight.js` has no
  // `html`, it highlights HTML with its `xml` grammar.
  { id: "html", label: "HTML", hljs: "xml" },
  { id: "markdown", label: "Markdown", hljs: "markdown" },
  { id: "java", label: "Java", hljs: "java" },
];

/** The grammar `highlight.js` should be asked for, given one of our ids. */
export function highlightJsNameOf(id: CodeLanguageId): string {
  return CODE_LANGUAGES.find((language) => language.id === id)!.hljs;
}

/**
 * Read a language off whatever a stored block carries.
 *
 * The boundary where the attribute stops being trusted — the rule
 * `toLearningState` and `atomIdFromHash` already apply. A block written before
 * #32, a hand-edited row, or a language dropped from the list later all read as
 * Plain text. Nothing an unhighlighted block can be wrong about; the other
 * direction would colour a block by a grammar the Owner never picked, or ask
 * the highlighter for one it does not have and throw on an Article's page.
 *
 * `highlight.js`'s own names are refused too: `xml` is not something the picker
 * can show, so it is not something the document may hold.
 */
export function toCodeLanguage(value: unknown): CodeLanguageId | null {
  const known = CODE_LANGUAGES.find((language) => language.id === value);
  return known ? known.id : null;
}

/** What the picker reads for a block, Plain text included. */
export function labelOfCodeLanguage(id: CodeLanguageId | null): string {
  if (id === null) return PLAIN_TEXT_LABEL;
  return CODE_LANGUAGES.find((language) => language.id === id)!.label;
}

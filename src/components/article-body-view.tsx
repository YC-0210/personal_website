import { Fragment, type ReactNode } from "react";

import { imageInNode } from "@/articles/article-image";
import { highlightCode } from "@/articles/code-highlight";
import { toCodeLanguage } from "@/articles/code-languages";
import type { ArticleBody, ArticleBodyNode } from "@/articles/domain";

/**
 * An Article's body, read.
 *
 * Rendered from the stored document straight to React elements — no HTML string
 * is built anywhere along the way, so there is nothing for `dangerouslySetInnerHTML`
 * to be tempted by. A node this does not recognise is dropped rather than
 * guessed at, which is the same bet decision 8 on #28 makes about paste: what
 * the editor cannot produce, the reader never sees.
 *
 * The node and mark names here must match the extension set in
 * `@/articles/editor-extensions` — that file is the source of truth for what a
 * body may contain, and this is what it looks like once written.
 */
export function ArticleBodyView({
  body,
  className = "",
}: {
  body: ArticleBody;
  className?: string;
}) {
  return (
    <div className={`article-prose ${className}`}>{children(body.content)}</div>
  );
}

function children(nodes: ArticleBodyNode[] | undefined): ReactNode {
  return (nodes ?? []).map((node, index) => (
    <Fragment key={index}>{renderNode(node)}</Fragment>
  ));
}

function renderNode(node: ArticleBodyNode): ReactNode {
  switch (node.type) {
    case "text":
      return withMarks(node);
    case "hardBreak":
      return <br />;
    case "paragraph":
      return <p>{children(node.content)}</p>;
    case "heading": {
      // Only levels 2 and 3 are enabled; the Article's own title is the h1.
      const Tag = node.attrs?.level === 3 ? "h3" : "h2";
      return <Tag>{children(node.content)}</Tag>;
    }
    case "blockquote":
      return <blockquote>{children(node.content)}</blockquote>;
    case "bulletList":
      return <ul>{children(node.content)}</ul>;
    case "orderedList":
      return <ol>{children(node.content)}</ol>;
    case "listItem":
      return <li>{children(node.content)}</li>;
    case "codeBlock":
      return <CodeBlock node={node} />;
    case "horizontalRule":
      return <hr />;
    case "image": {
      // `imageInNode` decides what is drawable and what the alt text is; a
      // node it refuses is dropped, like any other node this does not know.
      const image = imageInNode(node);
      if (!image) return null;
      // A plain <img>, not next/image: the sizes are the Owner's and the
      // bucket's, and the optimizer wants a build-time manifest it cannot have.
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt={image.alt} loading="lazy" />
      );
    }
    default:
      return null;
  }
}

/**
 * A code block, coloured for the language the Owner picked (#32).
 *
 * The colouring is built out of elements, never out of a string of markup — the
 * same rule the rest of this file follows, and the reason `lowlight` is used
 * rather than `highlight.js` directly. A block whose language is missing or
 * unrecognised comes back as one uncoloured run, which is exactly how every
 * block written before #32 renders.
 *
 * The class names are `highlight.js`'s, so this and the editor's own lowlight
 * extension share one rule set in `globals.css` and cannot drift into different
 * colours for the same token. The token *data* stays unprefixed; the prefix is
 * put back here, where it is a CSS concern rather than part of the reading.
 */
function CodeBlock({ node }: { node: ArticleBodyNode }) {
  const language = toCodeLanguage(node.attrs?.language);
  // A code block holds text and nothing else — no marks, no nested blocks.
  const code = (node.content ?? []).map((child) => child.text ?? "").join("");

  return (
    <pre data-language={language ?? undefined}>
      <code>
        {highlightCode(code, language).map((run, index) =>
          run.token === null ? (
            <Fragment key={index}>{run.text}</Fragment>
          ) : (
            <span key={index} className={`hljs-${run.token}`}>
              {run.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

/**
 * A text node's marks, wrapped outermost-first. A link is rendered without
 * `target` and with `rel="ugc"`: the Owner is the only author, but a link they
 * pasted still points somewhere they do not control.
 */
function withMarks(node: ArticleBodyNode): ReactNode {
  let rendered: ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        rendered = <strong>{rendered}</strong>;
        break;
      case "italic":
        rendered = <em>{rendered}</em>;
        break;
      case "strike":
        rendered = <s>{rendered}</s>;
        break;
      case "underline":
        rendered = <u>{rendered}</u>;
        break;
      case "code":
        rendered = <code>{rendered}</code>;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        // Only http(s). A `javascript:` href cannot come from the editor, but
        // it can come from a hand-edited row, and this costs one line.
        rendered = /^https?:\/\//i.test(href) ? (
          <a href={href} rel="ugc noopener noreferrer">
            {rendered}
          </a>
        ) : (
          rendered
        );
        break;
      }
      default:
        break;
    }
  }

  return rendered;
}

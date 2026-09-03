import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_BYTES,
  refusalFor,
  imagePathFor,
  imageInNode,
} from "./article-image";

const png = { name: "diagram.png", type: "image/png", size: 40_000 };

describe("what may go into an Article", () => {
  it("accepts an ordinary picture", () => {
    expect(refusalFor(png)).toBeNull();
  });

  it("refuses a file that is not an image, in words the Owner can act on", () => {
    const refusal = refusalFor({
      name: "notes.pdf",
      type: "application/pdf",
      size: 40_000,
    });

    expect(refusal).toMatch(/PNG, JPEG, WebP, GIF or AVIF/);
  });

  it("refuses one too big to sit in a page, and says how big it may be", () => {
    const refusal = refusalFor({ ...png, size: MAX_IMAGE_BYTES + 1 });

    expect(refusal).toMatch(/5 MB/);
  });

  it("accepts one exactly at the limit", () => {
    expect(refusalFor({ ...png, size: MAX_IMAGE_BYTES })).toBeNull();
  });
});

describe("where an Image is stored", () => {
  it("files it under the Article it belongs to, keeping the kind of file it is", () => {
    const path = imagePathFor("article-7", png);

    expect(path.startsWith("article-7/")).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("never reuses a name, so re-uploading does not overwrite the first", () => {
    const paths = new Set(
      Array.from({ length: 50 }, () => imagePathFor("article-7", png)),
    );

    expect(paths.size).toBe(50);
  });

  it("takes the extension from the type, not from the name the file arrived with", () => {
    // A name is the uploader's to choose and can say anything; the type is what
    // the bucket checks. They must not be allowed to disagree.
    const path = imagePathFor("article-7", {
      name: "screenshot.php",
      type: "image/jpeg",
      size: 1000,
    });

    expect(path.endsWith(".jpg")).toBe(true);
  });
});

describe("an Image as the reader gets it", () => {
  it("is drawn with the words that stand in for it when it cannot be", () => {
    expect(
      imageInNode({
        type: "image",
        attrs: { src: "https://bucket.test/a/b.png", alt: "The Sphere" },
      }),
    ).toEqual({ src: "https://bucket.test/a/b.png", alt: "The Sphere" });
  });

  it("has empty alt text rather than none when the Owner wrote none", () => {
    // Empty is the correct answer for a decorative picture, and it is what
    // stops a screen reader reading the URL out instead.
    expect(
      imageInNode({ type: "image", attrs: { src: "https://bucket.test/a/b.png" } })
        ?.alt,
    ).toBe("");
  });

  it("is dropped unless it is fetched over http(s)", () => {
    // The editor cannot produce these; a hand-edited row can. `javascript:` is
    // the one that matters, and `data:` is how markup smuggles itself in.
    for (const src of [
      "javascript:alert(1)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "",
    ]) {
      expect(imageInNode({ type: "image", attrs: { src } })).toBeNull();
    }
  });

  it("is dropped when it says nothing about where the picture is", () => {
    expect(imageInNode({ type: "image" })).toBeNull();
  });
});

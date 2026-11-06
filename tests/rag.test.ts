import { describe, expect, it } from "vitest";
import { BM25, tokenize } from "../src/lib/rag/bm25";
import { chunkDoc, parseDoc, windowText } from "../src/lib/rag/chunk";
import { cosine, reciprocalRankFusion } from "../src/lib/rag/fuse";

describe("parseDoc", () => {
  it("reads frontmatter and strips it from the body", () => {
    const d = parseDoc("x", "---\ntitle: Hello\nurl: https://a.b\n---\n\n# Hi\ntext");
    expect(d).toMatchObject({ id: "x", title: "Hello", url: "https://a.b" });
    expect(d.body.startsWith("---")).toBe(false);
  });
});

describe("chunkDoc", () => {
  it("splits on headings and keeps the heading path", () => {
    const d = parseDoc("p", "# Proj\nintro\n## Stack\nflask\n### DB\npostgres\n## Run\nnpm i");
    const c = chunkDoc(d);
    expect(c.map((x) => x.section)).toEqual(["Proj", "Proj > Stack", "Proj > Stack > DB", "Proj > Run"]);
  });
  it("ignores # lines inside code fences", () => {
    const c = chunkDoc(parseDoc("p", "## A\n```bash\n# not a heading\n```\n"));
    expect(c).toHaveLength(1);
    expect(c[0].text).toContain("# not a heading");
  });
});

describe("windowText", () => {
  it("keeps short text whole and splits long text with overlap", () => {
    expect(windowText("short", 100)).toEqual(["short"]);
    const long = Array.from({ length: 10 }, (_, i) => `para ${i} `.repeat(10)).join("\n\n");
    const w = windowText(long, 300, 50);
    expect(w.length).toBeGreaterThan(1);
    expect(w.every((x) => x.length <= 360)).toBe(true);
  });
});

describe("BM25", () => {
  it("ranks the document with the rare matching term first", () => {
    const bm = new BM25(["flask api with postgres", "react frontend with tailwind", "postgres row level security"]);
    expect(bm.rank("tailwind")[0][0]).toBe(1);
    expect(bm.rank("postgres security")[0][0]).toBe(2);
  });
  it("drops stopwords", () => {
    expect(tokenize("What is the stack of Kumail's app?")).toEqual(["stack", "app"]);
  });
});

describe("fusion", () => {
  it("rewards items ranked well in both lists", () => {
    const fused = reciprocalRankFusion([[1, 2, 3], [2, 1, 4]]);
    expect([fused[0][0], fused[1][0]].sort()).toEqual([1, 2]);
    expect(fused.at(-1)?.[0]).not.toBe(1);
  });
  it("cosine of identical vectors is 1", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

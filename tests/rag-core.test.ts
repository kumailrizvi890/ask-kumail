import { describe, expect, it } from "vitest";
import { BM25, tokenize } from "../src/lib/rag/bm25";
import { chunkDoc, chunkForIndex, parseDoc, windowText } from "../src/lib/rag/chunk";
import { cosine, reciprocalRankFusion } from "../src/lib/rag/fuse";

// Deeper coverage of the pure retrieval math: tokenization rules, BM25
// scoring behavior (IDF, TF saturation, length normalization), RRF score
// arithmetic, and chunking structure. rag.test.ts covers the basics; this
// file pins down the properties the ranking quality actually depends on.

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Hello, WORLD!")).toEqual(["hello", "world"]);
  });
  it("keeps tech tokens like c++, c# and node.js intact", () => {
    expect(tokenize("C++ and C#")).toEqual(["c++", "c#"]);
    expect(tokenize("Node.js 18 released.")).toEqual(["node.js", "18", "released"]);
  });
  it("drops single characters and stopword-only input", () => {
    expect(tokenize("What is the?")).toEqual([]);
    expect(tokenize("")).toEqual([]);
    expect(tokenize("a b c")).toEqual([]);
  });
});

describe("BM25 scoring", () => {
  it("returns nothing for a query with no matching terms", () => {
    const bm = new BM25(["flask api with postgres", "react frontend"]);
    expect(bm.rank("zzzz")).toEqual([]);
    expect(bm.rank("what is the")).toEqual([]); // stopwords only
  });
  it("handles an empty corpus", () => {
    expect(new BM25([]).rank("flask")).toEqual([]);
  });
  it("weights a rare term above a corpus-wide term", () => {
    const bm = new BM25(["shared alpha", "shared beta", "shared gamma"]);
    const rare = bm.rank("alpha");
    const common = bm.rank("shared");
    expect(rare.map(([i]) => i)).toEqual([0]);
    expect(common).toHaveLength(3);
    // same TF and doc length everywhere, so the gap is pure IDF
    expect(rare[0][1]).toBeGreaterThan(common[0][1]);
  });
  it("saturates term frequency instead of scaling linearly", () => {
    // equal-length docs, one mentions the term 5x as often
    const bm = new BM25(["apple bat cat dog emu", "apple apple apple apple apple"]);
    const ranked = bm.rank("apple");
    expect(ranked.map(([i]) => i)).toEqual([1, 0]);
    const [sTop, sLow] = [ranked[0][1], ranked[1][1]];
    expect(sTop).toBeGreaterThan(sLow);
    expect(sTop / sLow).toBeLessThan(2); // 5x the mentions, well under 5x the score
    // exact values: idf = ln(1.2), tf parts are 1 and 12.5/6.5
    expect(sLow).toBeCloseTo(Math.log(1.2), 6);
    expect(sTop).toBeCloseTo(Math.log(1.2) * (12.5 / 6.5), 6);
  });
  it("penalizes long documents for the same term count, unless b = 0", () => {
    const texts = ["apple", "apple banana cherry date elderberry fig grape huckleberry"];
    expect(new BM25(texts).rank("apple")[0][0]).toBe(0); // short doc wins
    const noNorm = new BM25(texts, 1.5, 0).rank("apple");
    expect(noNorm[0][1]).toBeCloseTo(noNorm[1][1], 10); // length ignored
  });
  it("adds a repeated query term's score once per occurrence", () => {
    const bm = new BM25(["apple pie"]);
    const once = bm.rank("apple")[0][1];
    expect(bm.rank("apple apple")[0][1]).toBeCloseTo(2 * once, 10);
  });
});

describe("reciprocalRankFusion arithmetic", () => {
  it("scores a lone item 1 / (k + rank)", () => {
    expect(reciprocalRankFusion([[7]], 60)).toEqual([[7, 1 / 61]]);
    expect(reciprocalRankFusion([[1, 2]], 0)).toEqual([
      [1, 1],
      [2, 0.5],
    ]);
  });
  it("sums contributions across lists", () => {
    const fused = reciprocalRankFusion([[1, 2], [2, 3]], 60);
    expect(fused.map(([i]) => i)).toEqual([2, 1, 3]);
    expect(fused[0][1]).toBeCloseTo(1 / 61 + 1 / 62, 10);
  });
  it("handles empty input", () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });
});

describe("cosine edge cases", () => {
  it("is 0 for a zero vector and -1 for opposite vectors", () => {
    expect(cosine([0, 0], [1, 2])).toBe(0);
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
  });
  it("is scale invariant", () => {
    expect(cosine([2, 4], [1, 2])).toBeCloseTo(1);
    expect(cosine([3, 4], [4, 3])).toBeCloseTo(24 / 25);
  });
});

describe("parseDoc fallbacks", () => {
  it("falls back to the id as title and an empty url without frontmatter", () => {
    const d = parseDoc("mydoc", "# Title\nbody");
    expect(d).toEqual({ id: "mydoc", title: "mydoc", url: "", body: "# Title\nbody" });
  });
  it("keeps colons inside frontmatter values", () => {
    const d = parseDoc("x", "---\ntitle: T\nurl: https://x.dev:8080/p\n---\nbody");
    expect(d.url).toBe("https://x.dev:8080/p");
    expect(d.body).toBe("body");
  });
});

describe("chunkDoc structure", () => {
  it("gives sequential ids and carries doc metadata into every chunk", () => {
    const d = parseDoc("guide", "---\ntitle: Guide\nurl: https://g.dev\n---\n# A\nx\n# B\ny");
    const chunks = chunkDoc(d);
    expect(chunks.map((c) => c.id)).toEqual(["guide#0", "guide#1"]);
    expect(chunks.every((c) => c.docId === "guide" && c.title === "Guide" && c.url === "https://g.dev")).toBe(true);
  });
  it("treats a headingless doc as one chunk with an empty section", () => {
    const chunks = chunkDoc(parseDoc("d", "just text\nmore text"));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe("");
    expect(chunks[0].text).toContain("more text");
  });
  it("produces no chunks from an empty body", () => {
    expect(chunkDoc(parseDoc("d", ""))).toEqual([]);
  });
});

describe("chunkForIndex", () => {
  it("prefixes the document title and section as context", () => {
    const [withSection] = chunkDoc(parseDoc("d", "---\ntitle: T\n---\n# A\nbody"));
    expect(chunkForIndex(withSection)).toBe("Document: T\nSection: A\n\nbody");
    const [noSection] = chunkDoc(parseDoc("d", "plain"));
    expect(chunkForIndex(noSection)).toBe("Document: d\n\nplain");
  });
});

describe("windowText splitting", () => {
  it("hard-splits a single paragraph longer than the window", () => {
    const pieces = windowText("x".repeat(250), 100, 20);
    expect(pieces).toHaveLength(4);
    expect(pieces.every((p) => p.length <= 100)).toBe(true);
    expect(pieces.at(-1)).toHaveLength(10);
  });
  it("carries the overlap tail into the next window", () => {
    const text = `${"A".repeat(90)}\n\n${"B".repeat(90)}`;
    const pieces = windowText(text, 100, 10);
    expect(pieces).toHaveLength(2);
    expect(pieces[1].startsWith("A".repeat(10))).toBe(true);
    expect(pieces[1]).toContain("B".repeat(90));
  });
});

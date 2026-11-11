import { describe, expect, it } from "vitest";
import { EVAL_SET, runEval } from "../src/lib/rag/eval";
import { allChunks, listDocuments, search, type SearchResult } from "../src/lib/rag/retriever";

// runEval's scoring math, checked with a fake search so the numbers are
// exact: half the questions find their document at rank 1, half at rank 2.
const byQuestion = new Map(EVAL_SET.map((e, i) => [e.q, { expect: e.expect, atOne: i % 2 === 0 }]));

function fakeSearch(mode: SearchResult["mode"], note?: string) {
  return async (q: string): Promise<SearchResult> => {
    const { expect: doc, atOne } = byQuestion.get(q)!;
    const ids = atOne ? [doc] : ["some-other-doc", doc];
    return {
      mode,
      note,
      hits: ids.map((docId, i) => ({
        id: `${docId}#0`, docId, title: docId, section: "", url: "", text: "x", rank: i + 1, score: 1,
      })),
    };
  };
}

describe("runEval scoring", () => {
  it("computes hit@1, hit@3 and MRR from document-level ranks", async () => {
    const s = await runEval(fakeSearch("hybrid"), "hybrid");
    expect(s.n).toBe(EVAL_SET.length);
    expect(s.hitAt1).toBe(50);
    expect(s.hitAt3).toBe(100);
    expect(s.mrr).toBeCloseTo(0.75, 6); // (1 + 1/2) / 2
    expect(s.fallbacks).toBe(0);
    expect(s.rows.every((r) => r.rankOfExpected === 1 || r.rankOfExpected === 2)).toBe(true);
  });
  it("counts mode fallbacks and surfaces the note", async () => {
    const s = await runEval(fakeSearch("keyword", "embeddings down"), "hybrid");
    expect(s.fallbacks).toBe(EVAL_SET.length);
    expect(s.note).toBe("embeddings down");
    expect(s.rows.every((r) => r.fellBack)).toBe(true);
  });
});

// Integration against the committed corpus in keyword mode (pure BM25, no
// embedding API needed): the direct questions must surface their document
// first, and the aggregate scores act as a regression pin for retrieval
// quality — if a corpus or ranking change hurts BM25, this fails.
describe("keyword search over the real corpus", () => {
  it("indexes every shipped document exactly once", () => {
    const docs = listDocuments();
    expect(docs.map((d) => d.id).sort()).toEqual(
      ["ask-kumail", "fade-kings", "ops-automation", "pawpass", "qmail", "resume", "tradepro"],
    );
    expect(docs.reduce((s, d) => s + d.sections, 0)).toBe(allChunks().length);
    expect(new Set(allChunks().map((c) => c.id)).size).toBe(allChunks().length);
  });
  it("ranks the expected document first for the direct eval questions", async () => {
    for (const { q, expect: doc } of EVAL_SET.slice(0, 16)) {
      const res = await search(q, 5, "keyword");
      expect(res.mode).toBe("keyword");
      expect(res.hits[0]?.docId, q).toBe(doc);
    }
  });
  it("keeps aggregate BM25 quality at or above the measured baseline", async () => {
    const s = await runEval(search, "keyword");
    expect(s.fallbacks).toBe(0);
    expect(s.hitAt1).toBeGreaterThanOrEqual(80); // measured baseline: 86.4
    expect(s.hitAt3).toBeGreaterThanOrEqual(90); // measured baseline: 95.5
  });
});

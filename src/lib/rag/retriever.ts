import { embed, embedMany } from "ai";
import { BM25 } from "./bm25";
import { type Chunk, chunkForIndex } from "./chunk";
import { cosine, reciprocalRankFusion } from "./fuse";
import generated from "./chunks.generated.json";
import { embeddingModel } from "./models";

export type Mode = "hybrid" | "keyword" | "vector";
export type Hit = Chunk & { rank: number; score: number };
export type SearchResult = { hits: Hit[]; mode: Mode; note?: string };

const chunks = generated.chunks as Chunk[];
const indexTexts = chunks.map(chunkForIndex);
const bm25 = new BM25(indexTexts);

// Chunk embeddings are computed once per server instance and reused.
// ~70 chunks is a single batched API call, so there is no separate vector database.
let chunkVectors: Promise<number[][]> | null = null;
function getChunkVectors(): Promise<number[][]> {
  if (!chunkVectors) {
    chunkVectors = embedMany({ model: embeddingModel, values: indexTexts }).then((r) => r.embeddings);
    chunkVectors.catch(() => (chunkVectors = null)); // retry on the next request instead of caching a failure
  }
  return chunkVectors;
}

export function allChunks(): Chunk[] {
  return chunks;
}

export function listDocuments() {
  const seen = new Map<string, { id: string; title: string; url: string; sections: number }>();
  for (const c of chunks) {
    const d = seen.get(c.docId) ?? { id: c.docId, title: c.title, url: c.url, sections: 0 };
    d.sections++;
    seen.set(c.docId, d);
  }
  return [...seen.values()];
}

// Query embeddings are cached so repeated questions (and the eval) don't re-call the API.
const queryCache = new Map<string, number[]>();

/** Embeds many questions in one batched call, e.g. before running the eval. */
export async function warmQueries(queries: string[]): Promise<void> {
  const missing = queries.filter((q) => !queryCache.has(q));
  if (missing.length === 0) return;
  const { embeddings } = await embedMany({ model: embeddingModel, values: missing });
  missing.forEach((q, i) => queryCache.set(q, embeddings[i]));
}

async function embedQuery(query: string): Promise<number[]> {
  const hit = queryCache.get(query);
  if (hit) return hit;
  const { embedding } = await embed({ model: embeddingModel, value: query });
  if (queryCache.size > 500) queryCache.clear();
  queryCache.set(query, embedding);
  return embedding;
}

async function vectorRanking(query: string): Promise<[number, number][]> {
  const [vectors, embedding] = await Promise.all([getChunkVectors(), embedQuery(query)]);
  return vectors
    .map((v, i) => [i, cosine(v, embedding)] as [number, number])
    .sort((a, b) => b[1] - a[1]);
}

export async function search(query: string, k = 5, mode: Mode = "hybrid"): Promise<SearchResult> {
  const keyword = bm25.rank(query);
  let ranked: [number, number][];
  let used: Mode = mode;
  let note: string | undefined;

  if (mode === "keyword") {
    ranked = keyword;
  } else {
    try {
      const vector = await vectorRanking(query);
      ranked =
        mode === "vector"
          ? vector
          : reciprocalRankFusion([keyword.map(([i]) => i), vector.slice(0, 50).map(([i]) => i)]);
    } catch (err) {
      // If the embedding API is unavailable, degrade to keyword search rather than failing.
      used = "keyword";
      ranked = keyword;
      note = `Embedding call failed, used keyword search only: ${(err as Error).message}`;
    }
  }

  const hits = ranked.slice(0, k).map(([i, score], r) => ({ ...chunks[i], rank: r + 1, score }));
  return { hits, mode: used, note };
}

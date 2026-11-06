// Build step: reads corpus/*.md, chunks every document, and (when a model key is
// available) embeds every chunk once, writing src/lib/rag/chunks.generated.json.
// Precomputed vectors mean the server only embeds the question at request time.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embedMany } from "ai";
import { chunkDoc, chunkForIndex, parseDoc } from "../src/lib/rag/chunk";
import { docEmbedOptions, embeddingId, embeddingModel } from "../src/lib/rag/models";

async function main() {
  const dir = join(process.cwd(), "corpus");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const chunks = files.flatMap((f) => chunkDoc(parseDoc(f.replace(/\.md$/, ""), readFileSync(join(dir, f), "utf8"))));

  let vectors: number[][] | null = null;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    try {
      const res = await embedMany({ model: embeddingModel, values: chunks.map(chunkForIndex), ...docEmbedOptions });
      vectors = res.embeddings.map((v) => v.map((x) => Math.round(x * 1e5) / 1e5));
    } catch (err) {
      console.warn(`Skipping precomputed embeddings: ${(err as Error).message}`);
    }
  }

  writeFileSync(
    join(process.cwd(), "src/lib/rag/chunks.generated.json"),
    JSON.stringify({ builtFrom: files, chunks, embeddingId: vectors ? embeddingId : null, vectors }),
  );
  console.log(`Indexed ${files.length} documents into ${chunks.length} chunks${vectors ? `, with ${vectors[0].length}-dim vectors` : " (no vectors; computed at runtime)"}`);
}

main();

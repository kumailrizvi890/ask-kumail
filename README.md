# Ask Kumail

A retrieval-augmented generation (RAG) assistant and a remote **Model Context Protocol (MCP)** server over my resume and project READMEs. Ask a question in the browser, or connect Claude (or any MCP client) to the server and let it search my work directly.

**Live:** https://ask-kumail.vercel.app · **MCP endpoint:** `https://ask-kumail.vercel.app/api/mcp` · **Eval results:** [`/api/eval`](https://ask-kumail.vercel.app/api/eval)

## How it works

```
corpus/*.md ──► chunk by heading ──► chunks.generated.json   (build time)

question ──┬─► BM25 keyword ranking ──┐
           └─► embedding similarity ──┴─► reciprocal rank fusion ──► top 5 chunks
                                                                          │
                       LLM answers ONLY from those chunks, citing [1][2] ◄┘
```

1. **Chunking** (`src/lib/rag/chunk.ts`): each markdown file is split on headings, so a chunk covers one topic. Long sections are windowed to ~1,000 characters with overlap. Every chunk keeps a header (`Document: PawPass / Section: Tech Stack`) so it still makes sense on its own.
2. **Keyword search** (`bm25.ts`): BM25, written from scratch. Rare words that match count more, and long chunks don't win just by being long.
3. **Semantic search** (`retriever.ts`): chunks and the question are embedded and compared with cosine similarity. `models.ts` picks the provider: Gemini (`gemini-embedding-001`, `gemini-3.5-flash`) when `GOOGLE_GENERATIVE_AI_API_KEY` is set, otherwise the Vercel AI Gateway (`openai/text-embedding-3-small`, `anthropic/claude-haiku-5.5`). With ~70 chunks, vectors are computed once per server instance and kept in memory, so no vector database is needed at this size.
4. **Fusion** (`fuse.ts`): reciprocal rank fusion merges the two rankings by position (score = Σ 1/(60 + rank)), which avoids comparing BM25 scores to cosine scores directly.
5. **Generation** (`answer.ts`): the top chunks go to the model as numbered passages. The instructions require a citation on every claim, say "I don't know" when the passages don't cover it, and treat passage text as data, not commands.
6. **Graceful degradation**: if the embedding API fails, search falls back to BM25. If the model fails, the API returns the best passage instead of an error.

## MCP server

`src/app/api/mcp/route.ts` uses `mcp-handler` to serve a stateless Streamable HTTP MCP server with three tools:

| Tool | What it does |
| --- | --- |
| `search_docs` | Hybrid search, returns passages with source links |
| `ask_kumail` | Full RAG answer with numbered citations |
| `list_projects` | Lists every document in the knowledge base |

In Claude, add a custom connector with the endpoint URL above.

## Evaluation

`src/lib/rag/eval.ts` holds 22 labeled questions (16 direct, 6 paraphrased with little word overlap). `/api/eval` runs all of them in keyword-only, vector-only and hybrid mode and reports hit@1, hit@3 and mean reciprocal rank at the document level.

## Run it

```bash
npm install
npm test          # unit tests for chunking, BM25 and fusion
echo 'GOOGLE_GENERATIVE_AI_API_KEY=...' > .env.local   # free key from Google AI Studio
npm run dev
```

The public endpoints are rate-limited per IP.

Stack: Next.js 16, TypeScript, Vercel AI SDK, Gemini API / Vercel AI Gateway, mcp-handler, Zod, Vitest.

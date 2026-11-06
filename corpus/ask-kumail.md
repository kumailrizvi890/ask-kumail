---
title: Ask Kumail (this project)
url: https://github.com/kumailrizvi890/ask-kumail
---

# Ask Kumail

Ask Kumail is a retrieval-augmented generation (RAG) assistant and a remote Model Context Protocol (MCP) server over Kumail's resume and project documentation. Built with Next.js, TypeScript and the Vercel AI SDK, deployed on Vercel.

## How retrieval works

Documents are split by markdown headings into chunks, and each chunk keeps its document title and section path as a header. Retrieval is hybrid: BM25 keyword scoring and embedding cosine similarity (OpenAI text-embedding-3-small through the Vercel AI Gateway) each produce a ranking, and the two rankings are merged with reciprocal rank fusion. The top chunks are sent to the model, which must answer only from them and cite them by number.

## MCP server

The /api/mcp endpoint is a stateless Streamable HTTP MCP server with three tools: search_docs, ask_kumail and list_projects. Any MCP client, such as Claude, can connect to it by URL.

## Evaluation

A labeled question set measures whether the correct document appears in the top results (hit@1, hit@3, MRR) for keyword-only, vector-only and hybrid retrieval.

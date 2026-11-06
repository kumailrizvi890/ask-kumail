import { runEval } from "@/lib/rag/eval";
import { search } from "@/lib/rag/retriever";

export const maxDuration = 60;

// Runs the labeled eval set against all three retrieval modes.
// Results are cached for an hour so this can't be used to burn API credits.
let cached: { at: number; data: unknown } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < 3_600_000) return Response.json(cached.data);
  const results = [];
  for (const mode of ["keyword", "vector", "hybrid"] as const) results.push(await runEval(search, mode));
  const data = {
    summary: results.map(({ mode, n, hitAt1, hitAt3, mrr, note }) => ({ mode, n, hitAt1, hitAt3, mrr, note })),
    details: results,
  };
  cached = { at: Date.now(), data };
  return Response.json(data);
}

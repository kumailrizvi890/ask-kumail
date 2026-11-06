import { EVAL_SET, runEval } from "@/lib/rag/eval";
import { search, warmQueries } from "@/lib/rag/retriever";

export const maxDuration = 60;

// Runs the labeled eval set against all three retrieval modes.
// Results are cached for an hour so this can't be used to burn API credits.
let cached: { at: number; data: unknown } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < 3_600_000) return Response.json(cached.data);
  // One batched embedding call for all questions, so the 66 searches below are local math.
  let warmError: string | undefined;
  await warmQueries(EVAL_SET.map((e) => e.q)).catch((e: Error) => (warmError = e.message));
  const results = [];
  for (const mode of ["keyword", "vector", "hybrid"] as const) results.push(await runEval(search, mode));
  const data = {
    summary: results.map(({ mode, n, hitAt1, hitAt3, mrr, note }) => ({ mode, n, hitAt1, hitAt3, mrr, note })),
    warmError,
    details: results,
  };
  cached = { at: Date.now(), data };
  return Response.json(data);
}

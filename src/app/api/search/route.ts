import { type Mode, search } from "@/lib/rag/retriever";
import { allow } from "@/lib/limit";

export const maxDuration = 30;

// GET /api/search?q=...&k=5&mode=hybrid|keyword|vector
export async function GET(req: Request) {
  if (!allow(req, 20)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 500);
  if (!q) return Response.json({ error: "Missing ?q=" }, { status: 400 });
  const k = Math.min(10, Math.max(1, Number(url.searchParams.get("k")) || 5));
  const m = url.searchParams.get("mode");
  const mode: Mode = m === "keyword" || m === "vector" ? m : "hybrid";
  return Response.json(await search(q, k, mode));
}

import { answerQuestion } from "@/lib/rag/answer";
import { allow } from "@/lib/limit";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!allow(req)) return Response.json({ error: "Too many questions, try again in a minute." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return Response.json({ error: "Send { question: string }" }, { status: 400 });
  return Response.json(await answerQuestion(question));
}

// GET /api/ask?q=... for quick testing from a browser or curl.
export async function GET(req: Request) {
  if (!allow(req)) return Response.json({ error: "Too many questions, try again in a minute." }, { status: 429 });
  const question = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 500);
  if (!question) return Response.json({ error: "Missing ?q=" }, { status: 400 });
  return Response.json(await answerQuestion(question));
}

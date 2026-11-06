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

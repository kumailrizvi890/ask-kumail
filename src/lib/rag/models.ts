import { google } from "@ai-sdk/google";

// Two ways to run the models:
// 1. GOOGLE_GENERATIVE_AI_API_KEY set -> call Gemini directly (free tier, no card needed).
// 2. Otherwise -> Vercel AI Gateway, which authenticates automatically on Vercel.
const useGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export const provider = useGemini ? "gemini" : "ai-gateway";

export const embeddingModel = useGemini
  ? google.embeddingModel(process.env.EMBEDDING_MODEL ?? "gemini-embedding-001")
  : (process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small");

export const chatModel = useGemini
  ? google(process.env.CHAT_MODEL ?? "gemini-3.5-flash")
  : (process.env.CHAT_MODEL ?? "anthropic/claude-haiku-5.5");

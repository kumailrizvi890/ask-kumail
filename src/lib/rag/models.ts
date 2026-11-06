import { google } from "@ai-sdk/google";

// Two ways to run the models:
// 1. GOOGLE_GENERATIVE_AI_API_KEY set -> call Gemini directly (free tier, no card needed).
// 2. Otherwise -> Vercel AI Gateway, which authenticates automatically on Vercel.
const useGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export const provider = useGemini ? "gemini" : "ai-gateway";

const embeddingName = process.env.EMBEDDING_MODEL ?? (useGemini ? "gemini-embedding-001" : "openai/text-embedding-3-small");

export const embeddingModel = useGemini ? google.embeddingModel(embeddingName) : embeddingName;

/** Identifies which model + settings produced a vector, so stale precomputed vectors are never mixed in. */
export const embeddingId = `${provider}:${embeddingName}:${useGemini ? 768 : "default"}`;

// Gemini embeds documents and questions slightly differently when told which is which,
// and 768 dimensions keeps the precomputed vectors small.
const googleOpts = (taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") =>
  useGemini ? { providerOptions: { google: { outputDimensionality: 768, taskType } } } : {};
export const docEmbedOptions = googleOpts("RETRIEVAL_DOCUMENT");
export const queryEmbedOptions = googleOpts("RETRIEVAL_QUERY");

export const chatModel = useGemini
  ? google(process.env.CHAT_MODEL ?? "gemini-3.5-flash")
  : (process.env.CHAT_MODEL ?? "anthropic/claude-haiku-5.5");

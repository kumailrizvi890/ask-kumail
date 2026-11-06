import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { answerQuestion } from "@/lib/rag/answer";
import { listDocuments, search } from "@/lib/rag/retriever";

export const maxDuration = 30;

// A remote MCP server. Any MCP client (Claude, Cursor, etc.) can add this URL
// and call these tools; the same retrieval code powers the website.
const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_docs",
      {
        title: "Search Kumail's documents",
        description:
          "Hybrid keyword + semantic search over Kumail Rizvi's resume and project READMEs. Returns the most relevant passages with their source.",
        inputSchema: z.object({
          query: z.string().min(1).max(500).describe("What to look for"),
          k: z.number().int().min(1).max(10).default(5).describe("How many passages to return"),
        }),
      },
      async ({ query, k }) => {
        const { hits, mode } = await search(query, k);
        const text = hits
          .map((h) => `[${h.rank}] ${h.title}${h.section ? ` > ${h.section}` : ""} (${h.url})\n${h.text}`)
          .join("\n\n---\n\n");
        return { content: [{ type: "text", text: `Retrieval mode: ${mode}\n\n${text || "No matches."}` }] };
      },
    );

    server.registerTool(
      "ask_kumail",
      {
        title: "Ask about Kumail",
        description: "Answers a question about Kumail Rizvi's experience or projects, grounded in his documents, with numbered citations.",
        inputSchema: z.object({ question: z.string().min(1).max(500) }),
      },
      async ({ question }) => {
        const a = await answerQuestion(question);
        const sources = a.sources.map((s) => `[${s.n}] ${s.title}${s.section ? ` > ${s.section}` : ""} ${s.url}`).join("\n");
        return { content: [{ type: "text", text: `${a.answer}\n\nSources:\n${sources}` }] };
      },
    );

    server.registerTool(
      "list_projects",
      {
        title: "List documents",
        description: "Lists every document in the knowledge base (resume and project READMEs) with links.",
        inputSchema: z.object({}),
      },
      async () => ({
        content: [
          { type: "text", text: listDocuments().map((d) => `- ${d.title}: ${d.url} (${d.sections} sections)`).join("\n") },
        ],
      }),
    );
  },
  { serverInfo: { name: "ask-kumail", version: "1.0.0" } },
);

export { handler as GET, handler as POST };

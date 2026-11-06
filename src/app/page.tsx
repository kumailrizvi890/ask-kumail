"use client";

import { useState } from "react";

type Answer = {
  answer: string;
  sources: { n: number; title: string; section: string; url: string }[];
  retrieval: string;
  generated: boolean;
  error?: string;
};

const EXAMPLES = [
  "What has Kumail built with Python?",
  "How does PawPass work offline?",
  "What did he do at the Qmail hackathon?",
  "Which projects use Supabase?",
];

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Answer | null>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    setQ(question);
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setRes(await r.json());
    } catch {
      setRes({ answer: "", sources: [], retrieval: "", generated: false, error: "Network error, try again." });
    } finally {
      setLoading(false);
    }
  }

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  return (
    <main>
      <h1>Ask about Kumail&apos;s work</h1>
      <p className="lede">
        Answers come only from{" "}
        <a href="https://github.com/kumailrizvi890/ask-kumail/tree/main/corpus">his resume and project READMEs</a>, with
        citations. Built with hybrid retrieval (BM25 + embeddings) and an MCP server.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. What stack did he use for TradePro?"
          maxLength={500}
          aria-label="Your question"
        />
        <button disabled={loading}>{loading ? "Thinking…" : "Ask"}</button>
      </form>

      <div className="chips">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" className="chip" onClick={() => ask(e)} disabled={loading}>
            {e}
          </button>
        ))}
      </div>

      {res && (
        <div className="card" aria-live="polite">
          {res.error ? (
            <p className="err">{res.error}</p>
          ) : (
            <>
              <div className="answer">{res.answer}</div>
              <ol className="sources">
                {res.sources.map((s) => (
                  <li key={s.n}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                    {s.section ? ` › ${s.section}` : ""}
                  </li>
                ))}
              </ol>
              <div className="meta">
                Retrieval: {res.retrieval}
                {res.generated ? "" : " · model unavailable, showing the top passage"}
              </div>
            </>
          )}
        </div>
      )}

      <h2>Use it from Claude or any MCP client</h2>
      <p className="lede" style={{ marginBottom: 10 }}>
        Add this as a remote MCP server. Tools: <code>search_docs</code>, <code>ask_kumail</code>,{" "}
        <code>list_projects</code>.
      </p>
      <pre>{mcpUrl}</pre>

      <footer>
        <a href="https://github.com/kumailrizvi890/ask-kumail">Source on GitHub</a> ·{" "}
        <a href="/api/eval">Retrieval eval results</a> ·{" "}
        <a href="https://portfolio-kumailr.vercel.app">Portfolio</a>
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";

type Answer = {
  answer: string;
  sources: { n: number; title: string; section: string; url: string }[];
  retrieval: string;
  generated: boolean;
  error?: string;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text?: string;
  answer?: Answer | null;
};

const EXAMPLES = [
  "What has Kumail built with Python?",
  "How does PawPass work offline?",
  "What did he do at the Qmail hackathon?",
  "Which projects use Supabase?",
];

const OPENING_MESSAGE =
  "Hi — I'm the Ask Kumail bot, here to answer questions about Kumail and his work. Every answer I give comes only from his resume and project docs, with citations you can check. Try one of the examples below, or ask your own question.";

const EVAL_BARS = [
  { method: "BM25", value: "86.4%", height: 86.4, note: "Keyword ranking, no libraries", barClass: "eval-bar-bm25" },
  { method: "Hybrid", value: "90.9%", height: 90.9, note: "Reciprocal rank fusion", barClass: "eval-bar-hybrid" },
  { method: "Embeddings", value: "100%", height: 100, note: "Semantic ranking", barClass: "eval-bar-embeddings" },
];

function BotAvatar() {
  return (
    <span className="bot-avatar" role="img" aria-label="Ask Kumail bot">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="2" r="1.4" fill="currentColor" />
        <rect x="5" y="5" width="14" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="9" cy="10.5" r="1.4" fill="currentColor" />
        <circle cx="15" cy="10.5" r="1.4" fill="currentColor" />
        <line x1="9.5" y1="14" x2="14.5" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="5" y1="10" x2="3" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="21" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: "assistant", text: OPENING_MESSAGE },
  ]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const userId = Date.now();
    const botId = userId + 1;
    setQ("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text: question.trim() },
      { id: botId, role: "assistant", text: "Thinking…" },
    ]);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await r.json()) as Answer;
      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { id: botId, role: "assistant", answer: data } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { id: botId, role: "assistant", text: "Sorry — something went wrong asking that. Please try again." }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">Flagship · RAG + MCP</p>
      <h1>Ask about Kumail&apos;s work</h1>
      <p>
        Answers come only from{" "}
        <a href="https://github.com/kumailrizvi890/ask-kumail/blob/main/data/README.md">
          his resume and project READMEs
        </a>
        , with citations. Built with hybrid retrieval (BM25 + embeddings) and an MCP server.
      </p>
      <p className="hero-stats">
        <span><strong>86.4%</strong> BM25 hit@1 · 22-question eval</span>
        <span><strong>100%</strong> Embeddings hit@1</span>
        <span><strong>35</strong> Tests · CI green</span>
      </p>

      <section className="chat-panel" aria-label="Chat with the Ask Kumail bot">
        <form
          className="ask-bar"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <label htmlFor="question" className="ask-bar-label">
            <span className="ask-bar-dot" aria-hidden="true" /> Ask the bot about Kumail
          </label>
          <div className="ask-bar-row">
            <input
              id="question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask about Kumail…"
              aria-label="Ask the bot about Kumail"
              autoComplete="off"
            />
            <button type="submit" disabled={loading} className="ask-button">
              {loading ? "Asking…" : "Ask →"}
            </button>
          </div>
        </form>

        <div className="examples" aria-label="Example questions">
          <span className="examples-label">Example questions</span>
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} onClick={() => ask(ex)} disabled={loading} className="example-chip">
              {ex}
            </button>
          ))}
        </div>

        <ol className="messages">
          {messages.map((m) =>
            m.role === "user" ? (
              <li key={m.id} className="message-row user-row">
                <div className="message-bubble user-bubble">
                  <p className="message-role">You</p>
                  <p>{m.text}</p>
                </div>
              </li>
            ) : (
              <li key={m.id} className="message-row assistant-row">
                <BotAvatar />
                <div className="message-bubble assistant-bubble">
                  <p className="message-role">Ask Kumail Bot</p>
                  {m.answer ? (
                    <>
                      {m.answer.error ? (
                        <p className="error">{m.answer.error}</p>
                      ) : (
                        <>
                          <p>{m.answer.answer}</p>
                          {m.answer.sources.length > 0 && (
                            <div className="sources">
                              <h3>Sources</h3>
                              <ul>
                                {m.answer.sources.map((s) => (
                                  <li key={s.n}>
                                    <a href={s.url}>
                                      [{s.n}] {s.title} — {s.section}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="meta">
                            {m.answer.retrieval} · {m.answer.generated ? "Generated answer" : "Extractive answer"}
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <p className={m.text === "Thinking…" ? "thinking" : undefined}>{m.text}</p>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      </section>

      <section className="eval-section" id="evidence" aria-label="Retrieval evaluation results">
        <p className="eyebrow">Evidence · Ask Kumail</p>
        <h2>Measured, not claimed</h2>
        <p>
          Hit@1 on a 22-question evaluation: did the first retrieved result contain the answer? BM25 from
          scratch gets most of the way there — embeddings close the gap, and fusing the two is what ships.
        </p>
        <div
          className="eval-chart"
          role="img"
          aria-label="Bar chart: BM25 hit@1 86.4 percent, Hybrid hit@1 90.9 percent, Embeddings hit@1 100 percent on a 22-question evaluation"
        >
          {EVAL_BARS.map((bar) => (
            <div className="eval-column" key={bar.method}>
              <span className="eval-value">{bar.value}</span>
              <div className="eval-track">
                <div className={`eval-bar ${bar.barClass}`} style={{ height: `${bar.height}%` }} />
              </div>
              <span className="eval-label">{bar.method}</span>
            </div>
          ))}
        </div>
        <table className="eval-table">
          <caption>The same numbers, as a table</caption>
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">Hit@1</th>
              <th scope="col">Eval size</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {EVAL_BARS.map((bar) => (
              <tr key={bar.method}>
                <td>{bar.method}{bar.method === "BM25" ? " (written from scratch)" : ""}</td>
                <td>{bar.value}</td>
                <td>22 questions</td>
                <td>{bar.note}</td>
              </tr>
            ))}
            <tr>
              <td>Reciprocal rank fusion</td>
              <td>Ships in the product</td>
              <td>—</td>
              <td>Merges both rankings for the final answer</td>
            </tr>
          </tbody>
        </table>
      </section>

      <h2>Use it from Claude or any MCP client</h2>
      <p>
        Add this as a remote MCP server. Tools: <code>search_docs</code>, <code>ask_kumail</code>,{" "}
        <code>list_projects</code>.
      </p>
      <pre>
        <code>/api/mcp</code>
      </pre>
      <p>
        <a href="https://github.com/kumailrizvi890/ask-kumail">Source on GitHub</a> ·{" "}
        <a href="#evidence">Retrieval eval results</a> ·{" "}
        <a href="https://kumailrizvi.dev">Portfolio</a>
      </p>
    </main>
  );
}

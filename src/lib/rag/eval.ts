import type { Mode, SearchResult } from "./retriever";

// Each question is labeled with the document that should answer it. The
// questions are phrased the way a person would ask, not copied from the docs,
// so keyword search can't win just by matching exact words.
export const EVAL_SET: { q: string; expect: string }[] = [
  { q: "What did Kumail build for trading stocks and crypto?", expect: "tradepro" },
  { q: "Which technical indicators does the trading terminal compute?", expect: "tradepro" },
  { q: "How can a customer book a haircut without making an account?", expect: "fade-kings" },
  { q: "How do shop owners approve new barbers?", expect: "fade-kings" },
  { q: "Which project keeps working when volunteers lose their internet connection?", expect: "pawpass" },
  { q: "What database and ORM does the animal shelter app use?", expect: "pawpass" },
  { q: "How does the email app decide if a message is a scam?", expect: "qmail" },
  { q: "Which project placed at a hackathon?", expect: "qmail" },
  { q: "How are the scheduled workflows triggered?", expect: "ops-automation" },
  { q: "How does the tool find a meeting time that works for a candidate and an interviewer?", expect: "ops-automation" },
  { q: "Where does Kumail go to school and when does he graduate?", expect: "resume" },
  { q: "What sales experience does he have?", expect: "resume" },
  { q: "Which student organizations has he led?", expect: "resume" },
  { q: "How does the assistant combine keyword search with semantic search?", expect: "ask-kumail" },
  { q: "Can other AI assistants connect to his documents, and through what protocol?", expect: "ask-kumail" },
  { q: "How is retrieval quality measured?", expect: "ask-kumail" },
  // Paraphrases: little or no word overlap with the source document. These are
  // where semantic (embedding) search is supposed to help.
  { q: "Has he ever worked a retail or customer-facing job?", expect: "resume" },
  { q: "Which project involves investing or the stock market?", expect: "tradepro" },
  { q: "What would help a foster volunteer keep track of an animal's medicine?", expect: "pawpass" },
  { q: "Which app gives customers loyalty perks for coming back?", expect: "fade-kings" },
  { q: "Does anything run automatically on a timer without anyone clicking a button?", expect: "ops-automation" },
  { q: "Did he build something to protect people from phishing?", expect: "qmail" },
];

export type EvalRow = { q: string; expect: string; rankOfExpected: number | null; top3: string[]; fellBack: boolean };
export type EvalSummary = { mode: Mode; n: number; hitAt1: number; hitAt3: number; mrr: number; fallbacks: number; rows: EvalRow[]; note?: string };

const pct = (x: number) => Math.round(x * 1000) / 10;

export async function runEval(
  search: (q: string, k: number, mode: Mode) => Promise<SearchResult>,
  mode: Mode,
  k = 10,
): Promise<EvalSummary> {
  const rows: EvalRow[] = [];
  let note: string | undefined;
  for (const { q, expect } of EVAL_SET) {
    const res = await search(q, k, mode);
    if (res.mode !== mode) note = res.note;
    // rank at the document level: first position where any chunk of the expected doc appears
    const docOrder: string[] = [];
    for (const h of res.hits) if (!docOrder.includes(h.docId)) docOrder.push(h.docId);
    const pos = docOrder.indexOf(expect);
    rows.push({ q, expect, rankOfExpected: pos === -1 ? null : pos + 1, top3: docOrder.slice(0, 3), fellBack: res.mode !== mode });
  }
  const n = rows.length;
  const at = (r: number) => rows.filter((x) => x.rankOfExpected !== null && x.rankOfExpected <= r).length / n;
  const mrr = rows.reduce((s, x) => s + (x.rankOfExpected ? 1 / x.rankOfExpected : 0), 0) / n;
  // fallbacks = questions that silently used keyword search because an API call failed;
  // a run with fallbacks doesn't measure the mode it claims to.
  const fallbacks = rows.filter((r) => r.fellBack).length;
  return { mode, n, hitAt1: pct(at(1)), hitAt3: pct(at(3)), mrr: Math.round(mrr * 1000) / 1000, fallbacks, rows, note };
}

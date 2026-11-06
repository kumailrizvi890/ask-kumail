// BM25 keyword ranking, written from scratch so every step is visible.
//
// For each query term t in a document d:
//   idf(t)  = ln(1 + (N - df + 0.5) / (df + 0.5))         rare terms count more
//   tf part = f * (k1 + 1) / (f + k1 * (1 - b + b * |d| / avgdl))
//             (term frequency with diminishing returns, normalized by doc length)
// score(d) = sum over query terms of idf(t) * tf part

const STOP = new Set(
  "a an and are as at be by did do does for from has have he his how i in is it its kumail of on or s that the this to was what when where which who why with you your".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export class BM25 {
  private docs: string[][];
  private df = new Map<string, number>();
  private avgdl: number;

  constructor(texts: string[], private k1 = 1.5, private b = 0.75) {
    this.docs = texts.map(tokenize);
    for (const d of this.docs) for (const t of new Set(d)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgdl = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }

  /** Returns [docIndex, score] pairs, best first, skipping zero scores. */
  rank(query: string): [number, number][] {
    const q = tokenize(query);
    const N = this.docs.length;
    const scores: [number, number][] = [];
    this.docs.forEach((d, i) => {
      const tf = new Map<string, number>();
      for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
      let s = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        s += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.length) / this.avgdl)));
      }
      if (s > 0) scores.push([i, s]);
    });
    return scores.sort((a, b) => b[1] - a[1]);
  }
}

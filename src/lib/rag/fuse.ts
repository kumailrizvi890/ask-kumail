// Reciprocal rank fusion (RRF): merges several rankings without having to
// compare their raw scores (BM25 scores and cosine similarities live on
// different scales). Each list contributes 1 / (k + rank) for every item it
// ranks; items that rank well in both lists rise to the top.

export function reciprocalRankFusion(rankings: number[][], k = 60): [number, number][] {
  const score = new Map<number, number>();
  for (const list of rankings) {
    list.forEach((item, idx) => {
      score.set(item, (score.get(item) ?? 0) + 1 / (k + idx + 1));
    });
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

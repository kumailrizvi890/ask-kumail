// Turns markdown documents into retrievable chunks.
//
// Strategy: split on headings so each chunk is about one topic, keep the
// heading path ("PawPass > Tech Stack") as context, and window long sections
// so no chunk is too big to embed or cite.

export type Doc = { id: string; title: string; url: string; body: string };

export type Chunk = {
  id: string; // "pawpass#3"
  docId: string;
  title: string; // document title
  section: string; // heading path inside the document
  url: string;
  text: string; // the raw section text
};

const MAX_CHARS = 1000;
const OVERLAP_CHARS = 150;

/** Parses `---\nkey: value\n---` frontmatter at the top of a markdown file. */
export function parseDoc(id: string, raw: string): Doc {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return {
    id,
    title: meta.title ?? id,
    url: meta.url ?? "",
    body: m ? raw.slice(m[0].length) : raw,
  };
}

/** Splits text into windows of at most `max` chars, breaking on paragraphs, with overlap. */
export function windowText(text: string, max = MAX_CHARS, overlap = OVERLAP_CHARS): string[] {
  if (text.length <= max) return [text];
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > max) {
      out.push(cur);
      cur = cur.slice(-overlap); // carry the tail forward so ideas aren't cut in half
    }
    // a single paragraph longer than max gets hard-split
    if (p.length > max) {
      for (let i = 0; i < p.length; i += max - overlap) out.push(p.slice(i, i + max));
      cur = "";
      continue;
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function chunkDoc(doc: Doc): Chunk[] {
  const lines = doc.body.split("\n");
  const sections: { path: string; text: string }[] = [];
  const stack: string[] = []; // heading path, index = level - 1
  let buf: string[] = [];
  let inCode = false;

  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) sections.push({ path: stack.filter(Boolean).join(" > "), text });
    buf = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) inCode = !inCode;
    const h = !inCode && line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      stack.length = level - 1;
      stack[level - 1] = h[2].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  const chunks: Chunk[] = [];
  for (const s of sections) {
    for (const piece of windowText(s.text)) {
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        docId: doc.id,
        title: doc.title,
        section: s.path,
        url: doc.url,
        text: piece,
      });
    }
  }
  return chunks;
}

/** The text that actually gets embedded and keyword-indexed: a short header gives each chunk its context. */
export function chunkForIndex(c: Chunk): string {
  return `Document: ${c.title}${c.section ? `\nSection: ${c.section}` : ""}\n\n${c.text}`;
}

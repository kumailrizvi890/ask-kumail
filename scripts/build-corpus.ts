// Build step: reads corpus/*.md, chunks every document, and writes
// src/lib/rag/chunks.generated.json so the server never touches the filesystem.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chunkDoc, parseDoc } from "../src/lib/rag/chunk";

const dir = join(process.cwd(), "corpus");
const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
const chunks = files.flatMap((f) => chunkDoc(parseDoc(f.replace(/\.md$/, ""), readFileSync(join(dir, f), "utf8"))));

writeFileSync(
  join(process.cwd(), "src/lib/rag/chunks.generated.json"),
  JSON.stringify({ builtFrom: files, chunks }, null, 1),
);
console.log(`Indexed ${files.length} documents into ${chunks.length} chunks`);

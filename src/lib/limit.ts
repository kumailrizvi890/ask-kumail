// Simple per-IP rate limit so a public endpoint can't run up the AI bill.
// It lives in memory, so each server instance counts separately; fine for a demo.
const hits = new Map<string, number[]>();

export function allow(req: Request, perMinute = 8): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

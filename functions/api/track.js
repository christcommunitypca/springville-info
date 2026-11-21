// First-party, privacy-minimized analytics collection for Around Springville.
// Requires a Cloudflare D1 database bound as ANALYTICS_DB; no raw IP addresses,
// emails, full referrer URLs, or user agents are stored.
const allowedKinds = new Set(["home", "article", "event", "share"]);
const allowedHosts = new Set(["springville.info", "www.springville.info"]);
function response(status = 204) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}
async function initialize(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    content_id TEXT NOT NULL,
    visitor TEXT NOT NULL,
    source TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS analytics_day_kind ON analytics_events(day, kind)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS analytics_visitor_day ON analytics_events(visitor, day)").run();
}
export async function onRequestPost({ request, env }) {
  if (!env.ANALYTICS_DB) return response(503);
  const url = new URL(request.url);
  if (!allowedHosts.has(url.hostname)) return response();
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).origin !== url.origin) return response(403);
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return response(403);
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return response(415);
  const ua = request.headers.get("User-Agent") || "";
  if (/bot\b|crawler|spider|headless|lighthouse|preview/i.test(ua)) return response();
  if (request.cf?.botManagement?.score != null && request.cf.botManagement.score < 15) return response();
  let data;
  try {
    if (Number(request.headers.get("Content-Length")) > 1024) return response(413);
    const body = await request.text();
    if (body.length > 1024) return response(413);
    data = JSON.parse(body);
  } catch { return response(400); }
  const { kind, id = "", visitor = "", source = "Direct" } = data || {};
  if (!allowedKinds.has(kind) ||
      typeof id !== "string" || !/^[a-z0-9-]{0,110}$/.test(id) ||
      typeof visitor !== "string" || !/^[a-f0-9-]{36}$/.test(visitor) ||
      typeof source !== "string" || !/^[\w .&/-]{1,40}$/.test(source) ||
      (["article", "event"].includes(kind) && !id) ||
      (kind === "home" && id)) return response(400);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitor));
  const visitorKey = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const city = String(request.cf?.city || "Unknown").slice(0, 90);
  const region = String(request.cf?.region || "Unknown").slice(0, 90);
  const country = String(request.cf?.country || "Unknown").slice(0, 2);
  const insert = () => env.ANALYTICS_DB.prepare(
    "INSERT INTO analytics_events (day, kind, content_id, visitor, source, city, region, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(day, kind, id, visitorKey, source, city, region, country).run();
  try {
    await insert();
  } catch (error) {
    if (!/no such table/i.test(String(error))) return response(503);
    try { await initialize(env.ANALYTICS_DB); await insert(); }
    catch { return response(503); }
  }
  return response();
}
export function onRequestGet() { return response(405); }

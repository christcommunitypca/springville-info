// Owner-only Around Springville analytics.
// NEVER return readership data unless a Cloudflare Access JWT is fully verified
// for this application's AUD, team issuer, expiration, and exact owner email.
// This fails closed until Access and the D1 binding have been configured.
const OWNER_EMAIL = "hutchinsonfamily@gmail.com";
const NO_CACHE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
function textReply(message, status = 403) {
  return new Response(message, {status,headers:{"Content-Type":"text/plain; charset=utf-8",...NO_CACHE}});
}
function bytes(b64) {
  const s = b64.replace(/-/g,"+").replace(/_/g,"/");
  return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
}
function decodeJson(b64) { return JSON.parse(new TextDecoder().decode(bytes(b64))); }
async function ownerAuthorized(request,env) {
  const domain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/\/$/,"");
  const audience = String(env.ACCESS_AUD || "");
  if (!/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com$/i.test(domain) || !audience) return false;
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt || jwt.length > 10000) return false;
  const parts = jwt.split(".");
  if (parts.length !== 3) return false;
  try {
    const header=decodeJson(parts[0]), claims=decodeJson(parts[1]);
    const now=Math.floor(Date.now()/1000);
    if (header.alg!=="RS256" || !header.kid || claims.iss!==domain ||
        !((Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(audience)) ||
        typeof claims.exp!=="number" || claims.exp<=now ||
        (typeof claims.nbf==="number" && claims.nbf>now) ||
        (typeof claims.iat==="number" && claims.iat>now+60) ||
        String(claims.email||"").toLowerCase()!==OWNER_EMAIL) return false;
    const certs=await fetch(domain+"/cdn-cgi/access/certs");
    if (!certs.ok) return false;
    const jwks=await certs.json();
    const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid && k.kty==="RSA");
    if (!jwk) return false;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(parts[2]),
      new TextEncoder().encode(parts[0]+"."+parts[1]));
  } catch { return false; }
}
async function ensureTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT,day TEXT NOT NULL,kind TEXT NOT NULL,content_id TEXT NOT NULL,visitor TEXT NOT NULL,source TEXT NOT NULL,city TEXT NOT NULL,region TEXT NOT NULL,country TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS analytics_day_kind ON analytics_events(day, kind)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS analytics_visitor_day ON analytics_events(visitor, day)").run();
}
function dateInChicago(offsetDays) {
  const date = new Date(Date.now() - offsetDays*86400000);
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
async function report(db,period) {
  const days=({today:0,week:6,month:29,quarter:89,all:null})[period];
  const from = days===null ? "0000-01-01" : dateInChicago(days);
  const [main,repeat,articles,shares,cities,countries,sources,trend,earliest] = await Promise.all([
    db.prepare("SELECT COUNT(DISTINCT visitor) AS visitors,COUNT(*) AS pageViews,SUM(CASE WHEN kind='home' THEN 1 ELSE 0 END) AS homeViews,SUM(CASE WHEN kind='article' THEN 1 ELSE 0 END) AS articleReads,SUM(CASE WHEN kind='event' THEN 1 ELSE 0 END) AS eventReads FROM analytics_events WHERE kind IN ('home','article','event') AND day>=?").bind(from).first(),
    db.prepare("SELECT COUNT(DISTINCT e.visitor) AS returning FROM analytics_events e WHERE e.day>=? AND e.kind IN ('home','article','event') AND EXISTS (SELECT 1 FROM analytics_events prior WHERE prior.visitor=e.visitor AND prior.day<e.day AND prior.kind IN ('home','article','event'))").bind(from).first(),
    db.prepare("SELECT content_id AS id, COUNT(*) AS views,COUNT(DISTINCT visitor) AS readers FROM analytics_events WHERE kind='article' AND day>=? GROUP BY content_id ORDER BY views DESC LIMIT 12").bind(from).all(),
    db.prepare("SELECT content_id AS id,COUNT(*) AS taps FROM analytics_events WHERE kind='share' AND day>=? GROUP BY content_id ORDER BY taps DESC LIMIT 12").bind(from).all(),
    db.prepare("SELECT city,region,country,COUNT(DISTINCT visitor) AS visitors FROM analytics_events WHERE kind IN ('home','article','event') AND day>=? AND city<>'Unknown' GROUP BY city,region,country ORDER BY visitors DESC LIMIT 12").bind(from).all(),
    db.prepare("SELECT country,COUNT(DISTINCT visitor) AS visitors FROM analytics_events WHERE kind IN ('home','article','event') AND day>=? GROUP BY country ORDER BY visitors DESC LIMIT 10").bind(from).all(),
    db.prepare("SELECT source,COUNT(DISTINCT visitor) AS visitors FROM analytics_events WHERE kind IN ('home','article','event') AND day>=? GROUP BY source ORDER BY visitors DESC LIMIT 12").bind(from).all(),
    db.prepare("SELECT day,COUNT(*) AS views,COUNT(DISTINCT visitor) AS visitors FROM analytics_events WHERE kind IN ('home','article','event') AND day>=? GROUP BY day ORDER BY day ASC LIMIT 400").bind(from).all(),
    db.prepare("SELECT MIN(day) AS firstDay FROM analytics_events").first()
  ]);
  const shareTotal=await db.prepare("SELECT COUNT(*) AS total FROM analytics_events WHERE kind='share' AND day>=?").bind(from).first();
  return {period,from,firstDay:earliest?.firstDay||null,
    totals:{visitors:main?.visitors||0,pageViews:main?.pageViews||0,
      homeViews:main?.homeViews||0,articleReads:main?.articleReads||0,
      eventReads:main?.eventReads||0,shareTaps:shareTotal?.total||0,
      returning:repeat?.returning||0},
    articles:articles.results||[],shares:shares.results||[],
    cities:cities.results||[],countries:countries.results||[],
    sources:sources.results||[],trend:trend.results||[],
    age:"Not collected: browser traffic cannot reliably establish age.",
    note:"Unique and returning visitors are approximate per browser. Share taps count button use, not confirmed deliveries. City comes from approximate Cloudflare geolocation."};
}
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#173c53">
<link rel="icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&amp;family=DM+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<title>Readership | Around Springville</title>
<style>
*{box-sizing:border-box}html{background:#f5f9fb;color:#183449}body{margin:0;font:400 15px/1.5 "DM Sans",system-ui,sans-serif}
header{padding:20px max(20px,calc((100% - 1180px)/2));background:#173c53;color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px}
header .brand{font:800 27px/1 "Barlow Condensed",Impact,sans-serif;letter-spacing:.02em;text-transform:uppercase}
header small{display:block;color:#b9d2dd;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
header a{color:#fff;text-decoration:none;font-size:13px} main{max-width:1180px;padding:28px 20px 52px;margin:0 auto}
.top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:22px}
h1,h2,h3,p{margin:0}h1{font:800 clamp(36px,7vw,54px)/1 "Barlow Condensed",Impact,sans-serif;text-transform:uppercase}h2{font:800 25px/1.1 "Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.04em}
.sub{color:#5d7480;max-width:720px}.period{display:flex;gap:5px;flex-wrap:wrap}
.period button{border:1px solid #b7ced6;background:#fff;color:#26475d;border-radius:7px;padding:9px 11px;font:700 12px "DM Sans",sans-serif;cursor:pointer;min-height:40px}
.period button[aria-pressed=true]{background:#173c53;color:white;border-color:#173c53}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:0 0 24px}
.card,.panel{border:1px solid #d4e1e6;background:#fff;border-radius:9px}
.card{padding:16px 16px 15px;border-top:4px solid #3e756e}.card:nth-child(2n){border-top-color:#ae443e}
.card small{display:block;color:#607583;font-size:12px;font-weight:700}.card strong{display:block;font:800 clamp(28px,4vw,42px)/1.15 "Barlow Condensed",Impact,sans-serif;margin-top:7px}
.grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}.panel{padding:20px;margin-bottom:14px;min-width:0}
.panel p{color:#657985;font-size:12px;margin:6px 0 17px}.list{display:grid;gap:11px}
.barline{display:grid;grid-template-columns:minmax(0,1fr) 58px;align-items:center;gap:12px;font-size:13px}
.barname{overflow-wrap:anywhere;display:block;font-weight:650}.barvalue{text-align:right;font-variant-numeric:tabular-nums;color:#465f6e}
.bar{height:6px;border-radius:7px;background:#e9f0f2;margin-top:6px;overflow:hidden}.fill{height:100%;background:#42776d;border-radius:7px}
.grid .panel:nth-child(2n) .fill{background:#ae443e}.muted{color:#748691}
.trend{display:flex;align-items:end;gap:4px;height:115px;border-bottom:1px solid #cedce3;padding-top:13px}.trend span{background:#42776d;min-width:4px;flex:1;border-radius:3px 3px 0 0}
.note{font-size:12px;line-height:1.6;color:#5b7180;margin-top:14px}.error{padding:17px;border:1px solid #e4c3bd;background:#fff7f6;border-radius:8px;color:#98392f;margin-bottom:18px}
a{color:#a43c33}footer{padding:15px 20px 30px;max-width:1180px;margin:0 auto;color:#667985;border-top:1px solid #cadbe1;font-size:12px}
@media(max-width:740px){header{padding:16px}main{padding:23px 14px 38px}.cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.card{padding:14px 12px}.grid{grid-template-columns:1fr}.panel{padding:16px}}
</style></head>
<body>
<header><div><span class="brand">Around Springville</span><small>Owner-only readership</small></div><a href="/">Visit the community site ↗</a></header>
<main><div class="top"><div><h1>Readership</h1><p class="sub">Your private view of what neighbors read, share, and return to.</p></div>
<div class="period" aria-label="Reporting period"><button data-period="today">Today</button><button data-period="week">7 days</button><button data-period="month" aria-pressed="true">30 days</button><button data-period="quarter">90 days</button><button data-period="all">All time</button></div></div>
<p id="status" class="note" role="status">Loading your private statistics…</p>
<div class="cards" id="cards"></div>
<div class="grid">
<section class="panel"><h2>Most-read articles</h2><p>Article opens, not just homepage headline impressions</p><div class="list" id="articles"></div></section>
<section class="panel"><h2>Most shared</h2><p>Share button taps (sending a link is not guaranteed)</p><div class="list" id="shares"></div></section>
<section class="panel"><h2>Where readers are</h2><p>Approximate cities from Cloudflare; individual visitors are not identified</p><div class="list" id="cities"></div></section>
<section class="panel"><h2>How they found you</h2><p>Referring sites, search, or direct visits</p><div class="list" id="sources"></div></section>
<section class="panel"><h2>Readers over time</h2><p>Unique browsers per day</p><div class="trend" id="trend"></div></section>
<section class="panel"><h2>Age groups</h2><p>Ages cannot be inferred reliably from ordinary browsing</p><div class="muted">Not collected. No speculative age estimates.</div></section>
</div><p class="note" id="notes"></p></main><footer>Private analytics · Anonymous browser estimates · No exact IPs or full referral addresses stored</footer>
<script type="module" src="/assets/owner-dashboard.mjs"></script>
</body></html>`;
export async function onRequestGet({request,env}) {
  if (!await ownerAuthorized(request,env)) return textReply("Private dashboard: access not configured or account not authorized.");
  const url=new URL(request.url);
  if (url.searchParams.get("report")!=="1")
    return new Response(page,{headers:{"Content-Type":"text/html; charset=utf-8",...NO_CACHE}});
  if (!env.ANALYTICS_DB) return textReply("Readership storage needs a Cloudflare D1 database binding named ANALYTICS_DB.",503);
  const period=url.searchParams.get("period")||"month";
  if (!["today","week","month","quarter","all"].includes(period)) return textReply("Invalid period",400);
  try {
    await ensureTable(env.ANALYTICS_DB);
    return Response.json(await report(env.ANALYTICS_DB,period),{headers:NO_CACHE});
  } catch { return textReply("Analytics storage unavailable. Verify the D1 binding.",503); }
}
export function onRequestPost() { return textReply("Method not allowed",405); }

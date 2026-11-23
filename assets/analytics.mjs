// Anonymous, first-party readership metrics. All metrics are private to the owner.
// Does not collect age, names, emails, full referrer URLs or IP addresses.
// A random browser identifier enables approximate returning-reader counts.
const visitorKey = "around-springville-visitor-v1";
function anonymousVisitor() {
  try {
    let visitor = localStorage.getItem(visitorKey);
    if (!visitor || !/^[a-f0-9-]{36}$/.test(visitor)) {
      visitor = crypto.randomUUID();
      localStorage.setItem(visitorKey, visitor);
    }
    return visitor;
  } catch { return crypto.randomUUID(); }
}
function referralSource() {
  const utm = new URL(location.href).searchParams.get("utm_source");
  if (utm && /^[\w .&-]{1,40}$/.test(utm)) return utm.slice(0,40);
  const ref = document.referrer;
  if (!ref) return "Direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host === location.hostname) return "Direct";
    if (/(^|\.)facebook\.com$|(^|\.)fb\.me$|(^|\.)m\.facebook\.com$/.test(host)) return "Facebook";
    if (/(^|\.)instagram\.com$/.test(host)) return "Instagram";
    if (/(^|\.)google\./.test(host)) return "Google search";
    if (/(^|\.)bing\.com$/.test(host)) return "Bing search";
    if (/(^|\.)duckduckgo\.com$/.test(host)) return "DuckDuckGo";
    if (/(^|\.)reddit\.com$/.test(host)) return "Reddit";
    if (/(^|\.)nextdoor\.com$/.test(host)) return "Nextdoor";
    if (/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/.test(host)) return "X / Twitter";
    return "Other website";
  } catch { return "Direct"; }
}
const visitor = anonymousVisitor();
const source = referralSource();
const news = new Set(), events = new Set();
async function loadContentIds() {
  try {
    const response = await fetch("/data/content.json", {cache:"no-cache"});
    if (!response.ok) return;
    const data = await response.json();
    for (const item of data.news || []) if (item.slug) news.add(item.slug);
    for (const item of data.events || []) if (item.id) events.add(item.id);
  } catch { /* Anonymous homepage measurements still work. */ }
}
function classify() {
  // Count each original, owner-approved front-porch column as an article, not a homepage visit.
  const columnPath = location.pathname.match(/^\/front-porch\/([a-z0-9-]+)\.html$/);
  if (columnPath) return {kind:"article",id:"front-porch-" + columnPath[1]};
  let hash = "";
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch {}
  if (news.has(hash)) return {kind:"article",id:hash};
  if (events.has(hash)) return {kind:"event",id:hash};
  return {kind:"home",id:""};
}
function record(kind, id = "") {
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  if (!["springville.info","www.springville.info"].includes(location.hostname)) return;
  fetch("/api/track", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind,id,visitor,source}),keepalive:true,
    credentials:"same-origin",cache:"no-store"
  }).catch(() => {});
}
let lastRoute = null;
function recordPage() {
  const page = classify();
  const key = page.kind + ":" + page.id;
  if (key === lastRoute) return;
  lastRoute = key;
  record(page.kind,page.id);
}
async function start() {
  await loadContentIds();
  recordPage();
  window.addEventListener("hashchange",recordPage);
  document.addEventListener("click",event => {
    const button = event.target.closest("[data-share]");
    if (!button) return;
    const page = classify();
    // Share taps are tracked, not confirmed social-network deliveries.
    record("share",page.kind === "home" ? "" : page.id);
  },{capture:true});
}
start().catch(() => {});

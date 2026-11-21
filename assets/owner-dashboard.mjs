// Private dashboard UI. All reported counts come from the authenticated
// /analytics?report=1 endpoint; this asset contains no readership data.
const n = value => new Intl.NumberFormat("en-US").format(Number(value)||0);
const titleMap = new Map([["","Home page"]]);
async function titles() {
  try {
    const response=await fetch("/data/content.json",{cache:"no-cache"});
    if (!response.ok) return;
    const data=await response.json();
    for (const item of data.news || []) titleMap.set(item.slug,item.title);
    for (const item of data.events || []) titleMap.set(item.id,item.title);
  } catch {}
}
const el = id => document.getElementById(id);
function card(label,value) {
  const box=document.createElement("div");box.className="card";
  const text=document.createElement("small");text.textContent=label;
  const strong=document.createElement("strong");strong.textContent=n(value);
  box.append(text,strong);return box;
}
function rows(target,items,getName,getValue) {
  target.replaceChildren();
  if (!items.length) {
    const empty=document.createElement("div");
    empty.className="muted";empty.textContent="No activity recorded yet.";
    target.append(empty);return;
  }
  const max=Math.max(1,...items.map(getValue));
  for (const item of items) {
    const row=document.createElement("div");row.className="barline";
    const label=document.createElement("div");
    const name=document.createElement("span");name.className="barname";name.textContent=getName(item);
    const bg=document.createElement("div");bg.className="bar";
    const fill=document.createElement("div");fill.className="fill";
    fill.style.width=Math.max(2,100*getValue(item)/max)+"%";
    bg.append(fill);label.append(name,bg);
    const value=document.createElement("span");
    value.className="barvalue";value.textContent=n(getValue(item));
    row.append(label,value);target.append(row);
  }
}
function makeTrend(items) {
  const target=el("trend");
  target.replaceChildren();
  if (!items.length) {
    const empty=document.createElement("span");
    empty.textContent="No readings yet";empty.style.background="transparent";
    empty.style.height="auto";empty.style.color="#657985";
    target.append(empty);return;
  }
  const max=Math.max(1,...items.map(item=>item.visitors));
  for(const item of items) {
    const bar=document.createElement("span");
    bar.style.height=Math.max(3,100*item.visitors/max)+"%";
    bar.title=item.day+": "+n(item.visitors)+" visitor(s), "+n(item.views)+" view(s)";
    target.append(bar);
  }
}
async function load(period) {
  const status=el("status");
  status.textContent="Updating your statistics…";status.className="note";
  try {
    const response=await fetch("/analytics?report=1&period="+encodeURIComponent(period),{credentials:"same-origin",cache:"no-store"});
    if (!response.ok) throw Error(response.status===503?"Readership storage isn't connected yet.":"Owner access or analytics service is not available.");
    const data=await response.json(),t=data.totals;
    const cards=el("cards");
    cards.replaceChildren(
      card("Unique visitors",t.visitors),card("Page views",t.pageViews),
      card("Home page hits",t.homeViews),card("Article reads",t.articleReads),
      card("Share button taps",t.shareTaps),card("Returning readers",t.returning)
    );
    rows(el("articles"),data.articles,item=>titleMap.get(item.id)||item.id,item=>item.views);
    rows(el("shares"),data.shares,item=>titleMap.get(item.id)||item.id||"Home page",item=>item.taps);
    rows(el("cities"),data.cities,item=>[item.city,item.region,item.country].filter(s=>s&&s!=="Unknown").join(", "),item=>item.visitors);
    rows(el("sources"),data.sources,item=>item.source,item=>item.visitors);
    makeTrend(data.trend);
    status.textContent=data.firstDay?"Tracking began "+data.firstDay+".":"No readership data has been recorded yet.";
    el("notes").textContent=data.note;
  } catch (error) {
    status.className="error";
    status.textContent=error.message||"Statistics unavailable.";
    for(const id of ["cards","articles","shares","cities","sources","trend"])el(id).replaceChildren();
    el("notes").textContent="The dashboard requires Cloudflare Access and an ANALYTICS_DB binding. It never reveals stats without owner verification.";
  }
}
const buttons=[...document.querySelectorAll("[data-period]")];
for (const b of buttons) b.addEventListener("click",()=>{
  for(const other of buttons)other.setAttribute("aria-pressed",String(other===b));
  load(b.dataset.period);
});
titles().then(()=>load("month"));

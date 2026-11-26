// Standalone Did You Know archive. Uses a locally embedded initial snapshot, then
// refreshes from the same published news source as the homepage on every visit.
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function localDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(({type,value})=>[type,value]));
  return date.year+'-'+date.month+'-'+date.day;
}
const dateLabel = value => new Intl.DateTimeFormat('en-US', {
  timeZone:'UTC',year:'numeric',month:'long',day:'numeric'
}).format(new Date(value+'T12:00:00Z'));
const isFeature = item => item && item.category === 'Did you know?' &&
  /^[a-z0-9-]+$/.test(item.slug || '') && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '');
function normalize(items) {
  const today = localDate();
  return (Array.isArray(items) ? items : []).filter(item => isFeature(item) && item.date <= today)
    .sort((a,b) => b.date.localeCompare(a.date));
}
function trustedLink(url,label) {
  try {
    const parsed = new URL(url);
    if(parsed.protocol==='https:')return '<a href="'+escape(parsed.href)+'" rel="noopener noreferrer">'+escape(label)+' ↗</a>';
  } catch {}
  return '';
}
function sourceLinks(item) {
  const links = [trustedLink(item.sourceUrl, item.sourceLabel || item.sourceName || 'Read original source')];
  if (Array.isArray(item.additionalSources)) {
    for (const source of item.additionalSources) {
      if(source && source.url)links.push(trustedLink(source.url,source.label || 'Additional source'));
    }
  }
  return links.filter(Boolean).length ? '<div class="porch-response"><h2>Sources and further reading</h2><p>'+links.filter(Boolean).join(' · ')+'</p></div>' : '';
}

function renderResearchBlocks(blocks) {
  const links = b => (Array.isArray(b.links)?b.links:[]).map(l=>trustedLink(l.url,l.label)).filter(Boolean).join(' · ');
  const note = b => '<figcaption style="font-size:.84rem;line-height:1.5;margin-top:.65rem;opacity:.82">'+escape(b.note||'')+' '+links(b)+'</figcaption>';
  const figure = (b,html) => '<figure style="margin:1.5rem 0;padding:1rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:8px"><h3 style="margin:0 0 .85rem;font-size:1.1rem">'+escape(b.title)+'</h3>'+html+note(b)+'</figure>';
  return blocks.map(b=>{
    if(b.type==='heading')return '<h2>'+escape(b.text)+'</h2>';
    if(b.type==='paragraph')return '<p>'+escape(b.text)+(b.links?.length?' <span style="font-size:.9em">'+links(b)+'</span>':'')+'</p>';
    if(b.type==='table'){
      const headers=(b.headers||[]).map(h=>'<th scope="col" style="text-align:left;padding:.45rem;border-bottom:1px solid currentColor">'+escape(h)+'</th>').join('');
      const rows=(b.rows||[]).map(row=>'<tr>'+row.map((v,i)=>'<'+(i===0?'th scope="row"':'td')+' style="text-align:left;vertical-align:top;padding:.45rem;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)">'+escape(v)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('');
      return figure(b,'<div role="region" aria-label="'+escape(b.title)+'" tabindex="0" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem;line-height:1.4"><thead><tr>'+headers+'</tr></thead><tbody>'+rows+'</tbody></table></div>');
    }
    if(b.type==='bars'){
      const rows=(b.rows||[]).filter(row=>Number.isFinite(row.value)&&row.value>=0),max=Math.max(1,...rows.map(row=>row.value));
      return figure(b,rows.map(row=>'<div style="margin:.6rem 0"><div style="display:flex;justify-content:space-between;gap:.5rem;font-size:.88rem;'+(row.highlight?'font-weight:700':'')+'"><span>'+escape(row.label)+'</span><span style="white-space:nowrap">'+escape(row.value.toLocaleString('en-US'))+'</span></div><div style="height:.65rem;background:color-mix(in srgb,currentColor 10%,transparent);border-radius:3px;overflow:hidden"><div style="width:'+(row.value/max*100).toFixed(2)+'%;height:100%;background:'+(row.highlight?'#3979b9':'#8b99aa')+'"></div></div></div>').join(''));
    }
    if(b.type==='seams')return figure(b,'<svg viewBox="0 0 320 200" role="img" aria-label="Illustration comparing a 3 to 4 foot Springville ore bed with a 21 foot Birmingham ore seam at one documented site" style="display:block;width:100%;height:auto;max-width:440px;margin:auto;color:inherit"><rect x="10" y="15" width="145" height="145" rx="4" fill="#b6a18a"/><rect x="165" y="15" width="145" height="145" rx="4" fill="#b6a18a"/><g stroke="#8b7763" opacity=".65"><path d="M10 35h145 M10 55h145 M10 120h145 M10 140h145 M165 35h145 M165 140h145"/></g><rect x="10" y="76" width="145" height="21" fill="#96452f"/><rect x="165" y="24" width="145" height="126" fill="#96452f"/><g font-size="12" text-anchor="middle" font-weight="bold" fill="#fff"><text x="82.5" y="90">3–4 ft</text><text x="237.5" y="90">21 ft</text></g><g font-size="12" text-anchor="middle" fill="currentColor"><text x="82.5" y="179">Springville</text><text x="237.5" y="179">Red Mountain</text></g></svg>');
    return '';
  }).join('');
}

let features = normalize(JSON.parse(document.getElementById('dyk-snapshot').textContent));
const listView = document.getElementById('dyk-list-view');
const detailView = document.getElementById('dyk-detail-view');
const list = document.getElementById('dyk-list');
const article = document.getElementById('dyk-article');
function renderList() {
  list.innerHTML = features.length ? features.map(item =>
    '<a class="porch-archive-link" href="#'+escape(item.slug)+'">'+
    '<time datetime="'+escape(item.date)+'">'+escape(dateLabel(item.date))+'</time>'+
    '<h2>'+escape(item.title)+'</h2><p>'+escape(item.summary)+'</p>'+
    '<span>Read the story →</span></a>').join('') : '<p>No discoveries have been published yet.</p>';
}
function renderArticle(item) {
  const paragraphs = [item.summary,...(Array.isArray(item.body)?item.body:[])].filter(Boolean);
  const distinct = [...new Set(paragraphs)];
  const body = Array.isArray(item.articleBlocks) && item.articleBlocks.length ? renderResearchBlocks(item.articleBlocks) : distinct.map(text=>'<p>'+escape(text)+'</p>').join('');
  article.innerHTML = '<article class="porch-article"><header class="porch-article-heading">'+
    '<p class="porch-kicker">Did You Know?</p><h1>'+escape(item.title)+'</h1>'+
    '<div class="porch-meta"><time datetime="'+escape(item.date)+'">'+escape(dateLabel(item.date))+
    '</time><button class="porch-share" type="button" id="dyk-share">Share</button></div></header>'+
    '<div class="porch-article-copy">'+body+'</div>'+
    sourceLinks(item)+
    '<nav class="porch-explore" aria-label="More discoveries">'+
    '<p class="porch-explore-eyebrow">More Springville discoveries</p>'+
    '<a href="/did-you-know/" class="porch-explore-link">Read the Did You Know archive →</a></nav></article>';
  const share = document.getElementById('dyk-share');
  share.addEventListener('click',async()=>{
    const preview = typeof item.shareUrl==='string' && /^https:\/\/springville\.info\/preview\/news\/[-a-z0-9]+$/.test(item.shareUrl)
      ? item.shareUrl : location.href;
    if (navigator.share) {
      try { await navigator.share({title:item.title,url:preview});return; }
      catch (error) { if(error.name==='AbortError')return; }
    }
    try { await navigator.clipboard.writeText(preview);share.textContent='Link copied'; }
    catch { window.prompt('Copy this link',preview); }
  });
}
function route() {
  let slug = '';
  try { slug = decodeURIComponent(location.hash.slice(1)); } catch {}
  const selected = features.find(item => item.slug === slug);
  const hasHash = location.hash.length > 1;
  listView.hidden = hasHash;
  detailView.hidden = !hasHash;
  if (hasHash) {
    if(selected)renderArticle(selected);
    else article.innerHTML='<article class="porch-article"><div class="porch-article-copy"><h1>Story not found</h1><p>This discovery may have moved. <a href="/did-you-know/">Browse the archive.</a></p></div></article>';
  }
  document.title=selected ? selected.title+' | Did You Know? | Springville.info' : 'Did You Know? | Springville.info';
}
renderList();
route();
window.addEventListener('hashchange',()=>{
  route();
  window.scrollTo({top:0,left:0,behavior:'auto'});
});
fetch('/data/content.json',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw Error('Content currently unavailable');
  return response.json();
}).then(data=>{
  if(!Array.isArray(data.news))return;
  features=normalize(data.news);
  renderList();
  route();
}).catch(()=>{ /* Embedded published snapshot keeps archive navigable. */ });

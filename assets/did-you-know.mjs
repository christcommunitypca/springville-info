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
function dykUrl(value) {
  try {
    const u = new URL(value,'https://springville.info');
    return u.origin === 'https://springville.info' && u.pathname === '/did-you-know/' && /^#[a-z0-9-]+$/.test(u.hash) ? u.pathname+u.hash : '';
  } catch { return ''; }
}
function sourceLinks(item) {
  const seen = new Set(), links = [];
  const sources = [{url:item.sourceUrl,label:item.sourceLabel || item.sourceName || 'Original source'},...(item.additionalSources||[]),...(item.articleBlocks||[]).flatMap(b=>[...(b.links||[]),...(b.inlineLinks||[])])];
  for(const s of sources) {
    try {
      const u = new URL(s.url);
      if(u.protocol !== 'https:' || u.hostname === 'springville.info' || seen.has(u.href))continue;
      const link = trustedLink(u.href,s.label||'Source');
      if(link){seen.add(u.href);links.push(link);}
    } catch {}
  }
  return links.length ? '<section aria-label="References" style="margin:1.5rem 0 0;font-size:.83rem;font-style:italic;line-height:1.55"><p style="margin:0 0 .35rem;font-weight:600">References</p><ul style="margin:0;padding-left:1.1rem">'+links.map(l=>'<li style="margin:.25rem 0">'+l+'</li>').join('')+'</ul></section>' : '';
}
function renderResearchBlocks(blocks) {
  const dyk = l => {
    const href = dykUrl(l.url);
    if(!href)return '';
    const name = escape('Did You Know: '+(l.label||'Related story'));
    return '<a href="'+escape(href)+'" aria-label="'+name+'" title="'+name+'" style="display:inline-block;margin-left:.3em;padding:0 .28em;font-size:.68em;line-height:1.4;white-space:nowrap;font-weight:700;text-decoration:none;border:1px solid currentColor;border-radius:3px;vertical-align:.12em">DYK →</a>';
  };
  const inline = b => {
    let remaining = String(b.text || ''), out = '';
    for(const l of (b.inlineLinks || [])){
      if(!dykUrl(l.url))continue;
      const term = String(l.after || ''), i = remaining.indexOf(term);
      if(!term || i < 0)continue;
      out += escape(remaining.slice(0,i+term.length))+dyk(l);
      remaining = remaining.slice(i+term.length);
    }
    return out+escape(remaining)+(b.links||[]).filter(l=>dykUrl(l.url)).map(dyk).join('');
  };
  const note = b => b.note ? '<figcaption style="font-size:.84rem;line-height:1.5;margin-top:.65rem;opacity:.82">'+escape(b.note)+'</figcaption>' : '';
  const figure = (b,html) => '<figure style="margin:1.5rem 0;padding:1rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:8px"><h3 style="margin:0 0 .85rem;font-size:1.1rem">'+escape(b.title)+'</h3>'+html+note(b)+'</figure>';
  return blocks.map(b=>{
    if(b.type==='heading')return '<h2>'+escape(b.text)+'</h2>';
    if(b.type==='paragraph')return '<p>'+inline(b)+'</p>';
    if(b.type==='table'){
      const headers=(b.headers||[]).map(h=>'<th scope="col" style="text-align:left;padding:.45rem;border-bottom:1px solid currentColor">'+escape(h)+'</th>').join('');
      const rows=(b.rows||[]).map(row=>'<tr>'+row.map((v,i)=>'<'+(i===0?'th scope="row"':'td')+' style="text-align:left;vertical-align:top;padding:.45rem;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)">'+escape(v)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('');
      return figure(b,'<div role="region" aria-label="'+escape(b.title)+'" tabindex="0" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem;line-height:1.4"><thead><tr>'+headers+'</tr></thead><tbody>'+rows+'</tbody></table></div>');
    }
    if(b.type==='bars'){
      const rows=(b.rows||[]).filter(row=>Number.isFinite(row.value)&&row.value>=0),max=Math.max(1,...rows.map(row=>row.value));
      return figure(b,rows.map(row=>'<div style="margin:.6rem 0"><div style="display:flex;justify-content:space-between;gap:.5rem;font-size:.88rem;'+(row.highlight?'font-weight:700':'')+'"><span>'+escape(row.label)+'</span><span style="white-space:nowrap">'+escape(row.value.toLocaleString('en-US'))+'</span></div><div style="height:.65rem;background:color-mix(in srgb,currentColor 10%,transparent);border-radius:3px;overflow:hidden"><div style="width:'+(row.value/max*100).toFixed(2)+'%;height:100%;background:'+(row.highlight?'#3979b9':'#8b99aa')+'"></div></div></div>').join(''));
    }

    if(b.type==='mine-map'){
      const sections=[[6,5,4,3,2,1],[7,8,9,10,11,12],[18,17,16,15,14,13],[19,20,21,22,23,24],[30,29,28,27,26,25],[31,32,33,34,35,36]];
      const targets = {12:'3',13:'3',23:'2',27:'1',28:'1'};
      let cells='',marks='';
      sections.forEach((row,y)=>row.forEach((n,x)=>{
        const sx=26+x*44,sy=23+y*44;
        const marked=targets[n];
        cells+='<rect x="'+sx+'" y="'+sy+'" width="44" height="44" fill="'+(marked?'#d8e8f4':'#f0f1ed')+'" stroke="#acb6bb" stroke-width=".8"/><text x="'+(sx+5)+'" y="'+(sy+12)+'" font-size="9" fill="#4c5c66">'+n+'</text>';
        if(n===27||n===28){
          marks+='<rect x="'+sx+'" y="'+(sy+22)+'" width="22" height="22" fill="#3979b9" opacity=".75"/><text x="'+(sx+11)+'" y="'+(sy+37)+'" text-anchor="middle" font-weight="bold" font-size="12" fill="white">1</text>';
        }else if(marked){marks+='<circle cx="'+(sx+24)+'" cy="'+(sy+25)+'" r="10" fill="#3979b9"/><text x="'+(sx+24)+'" y="'+(sy+29)+'" text-anchor="middle" font-weight="bold" font-size="12" fill="white">'+marked+'</text>';}
      }));
      const svg='<svg viewBox="0 0 340 306" role="img" aria-label="Schematic north-oriented township grid highlighting historical Woodall, Aderholt, Wilson, Thomason and Goodwin mine areas" style="display:block;width:100%;height:auto;max-width:430px;margin:auto"><rect x="0" y="0" width="340" height="306" rx="6" fill="#f8fafb"/>'+cells+marks+'<g fill="#334155" font-size="11" text-anchor="middle"><text x="315" y="20" font-weight="bold">N</text><path d="M315 26l-6 13h12z" fill="#334155"/><text x="158" y="15" font-size="10">Township 14 South · Range 2 East</text><path d="M26 294h44" stroke="#334155" stroke-width="2"/><text x="48" y="304" font-size="8">~1 mile</text></g></svg>';
      const legend='<div style="font-size:.9rem;line-height:1.5;margin:.75rem 0 0"><p style="margin:.3rem 0"><strong>1</strong> Woodall mines · sections 27–28</p><p style="margin:.3rem 0"><strong>2</strong> Aderholt mine and Wilson prospect · section 23</p><p style="margin:.3rem 0"><strong>3</strong> Thomason and Goodwin prospects · sections 12–13</p></div>';
      return figure(b,svg+legend);
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
    '<nav class="porch-explore" aria-label="More discoveries">'+
    '<p class="porch-explore-eyebrow">More Springville discoveries</p>'+
    '<a href="/did-you-know/" class="porch-explore-link">Read the Did You Know archive →</a></nav>'+sourceLinks(item)+'</article>';
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

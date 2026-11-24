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
  const body = distinct.map(text=>'<p>'+escape(text)+'</p>').join('');
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
  window.scrollTo({top:0,left:0,behavior:'instant'});
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

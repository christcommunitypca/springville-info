// Server-rendered Open Graph previews for Around Springville's individual share buttons.
// Facebook does not read the #fragment and does not execute the site's client-side renderer.
// This dynamic route reads the existing public JSON; it never edits or republishes content.
const SITE = 'https://springville.info';
const IMAGE = SITE + '/assets/wordmark-layer.png';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const tag = (name,value) => '<meta property="' + name + '" content="' + escapeHtml(value) + '">';
const summarize = value => {
  const s = String(value ?? '').replace(/\s+/g,' ').trim();
  return s.length > 220 ? s.slice(0,217).replace(/\s+\S*$/,'') + '…' : s;
};
const reply = (text,status) => new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
export async function onRequestGet({request,env,params}) {
  const kind = String(params.kind || '');
  const slug = String(params.slug || '');
  if (!['story','event','sport'].includes(kind) || !/^[a-z0-9-]{1,140}$/.test(slug)) {
    return reply('Story not found',404);
  }
  const file = kind === 'sport' ? '/data/sports.json' : '/data/content.json';
  let data;
  try {
    const source = await env.ASSETS.fetch(new Request(new URL(file,request.url)));
    if (!source.ok) return reply('Story details temporarily unavailable',503);
    data = await source.json();
  } catch {
    return reply('Story details temporarily unavailable',503);
  }
  let item,title,description,viewUrl;
  if (kind === 'story') {
    item = Array.isArray(data.news) ? data.news.find(x => x.slug === slug) : null;
    if (!item) return reply('Story not found',404);
    title = item.title;
    description = item.summary;
    viewUrl = SITE + '/#' + encodeURIComponent(slug);
  } else if (kind === 'event') {
    item = Array.isArray(data.events) ? data.events.find(x => x.id === slug) : null;
    if (!item) return reply('Event not found',404);
    title = item.title;
    description = item.summary || [item.startDate,item.time,item.location].filter(Boolean).join(' · ');
    viewUrl = SITE + '/#' + encodeURIComponent(slug);
  } else {
    item = Array.isArray(data.games) ? data.games.find(x => x.id === slug) : null;
    if (!item) return reply('Game not found',404);
    title = 'Springville Tigers ' + [item.gender,item.sport].filter(Boolean).join(' ') +
      (item.opponent ? ' vs. ' + item.opponent : item.meetName || item.eventName ? ' — ' + (item.meetName || item.eventName) : '');
    description = [item.date, item.level, item.status === 'cancelled' ? 'Cancelled' :
      item.status === 'postponed' ? 'Postponed' : item.status === 'final' ? 'Completed' :
      'Schedule and results', item.resultText || ''].filter(Boolean).join(' · ');
    viewUrl = SITE + '/sports-detail.html?id=' + encodeURIComponent(slug);
  }
  const shareUrl = SITE + '/share/' + kind + '/' + encodeURIComponent(slug);
  const desc = summarize(description);
  // Redirect only browsers running JavaScript. Social scrapers read this HTML's OG tags.
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(title) + ' | Springville</title>' +
    '<meta name="description" content="' + escapeHtml(desc) + '">' +
    '<link rel="canonical" href="' + escapeHtml(shareUrl) + '">' +
    tag('og:type',kind === 'event' ? 'website' : 'article') +
    tag('og:site_name','Springville.Info') +
    tag('og:locale','en_US') +
    tag('og:title',title) +
    tag('og:description',desc) +
    tag('og:url',shareUrl) +
    tag('og:image',IMAGE) +
    tag('og:image:type','image/png') +
    tag('og:image:width','2172') +
    tag('og:image:height','724') +
    tag('og:image:alt','Around Springville, Alabama') +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + escapeHtml(title) + '">' +
    '<meta name="twitter:description" content="' + escapeHtml(desc) + '">' +
    '<meta name="twitter:image" content="' + IMAGE + '">' +
    '</head><body><p><a href="' + escapeHtml(viewUrl) + '">Read ' + escapeHtml(title) +
    ' on Springville.Info</a></p><script>location.replace(' + JSON.stringify(viewUrl) + ');</script></body></html>';
  return new Response(html,{headers:{
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'public, max-age=300',
    'X-Content-Type-Options':'nosniff'
  }});
}

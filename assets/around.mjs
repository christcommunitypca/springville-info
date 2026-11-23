const dayMs = 86400000;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const label = (day, options) => new Intl.DateTimeFormat('en-US', {timeZone:'UTC', ...options}).format(new Date(day));
function chicagoDate() {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(({type,value}) => [type,value]));
  return date.year + '-' + date.month + '-' + date.day;
}
function sectionLink(id) { return '#' + escape(encodeURIComponent(id)); }
function sourceLink(url, text) {
  try { if (new URL(url).protocol === 'https:') return '<a href="' + escape(url) + '">' + escape(text) + ' ↗</a>'; } catch {}
  return '';
}
function sourceTrail(item) {
  const primary = sourceLink(item.sourceUrl, item.sourceLabel || item.sourceName);
  const extras = Array.isArray(item.additionalSources)
    ? item.additionalSources.map(source => source && sourceLink(source.url, source.label)).filter(Boolean)
    : [];
  if (!extras.length) return primary;
  return '<div class="reading-links"><p><strong>Read more:</strong> ' + primary +
    '</p><div class="reading-extra"><p><strong>Explore further:</strong></p><ul>' +
    extras.map(link => '<li>' + link + '</li>').join('') + '</ul></div></div>';
}
function more(label, contents) {
  return contents ? '<details><summary>See more ' + label + '</summary>' + contents + '</details>' : '';
}
function newsRows(items) {
  if (!items.length) return '';
  return '<div class="stories">' + items.map(item => {
    const isFeature = item.category === 'Did you know?';
    const kind = isFeature ? '<small class="kind">Did you know?</small>' : '';
    const headline = escape(item.shortTitle || item.title);
    return '<a class="story" href="' + sectionLink(item.slug) + '"><h3>' + kind +
      (isFeature ? '<span class="story-headline">' + headline + '</span>' : headline) +
      '</h3><time datetime="' + escape(item.date) + '">' + label(item.date,{month:'short',day:'numeric'}) + '</time></a>';
  }).join('') + '</div>';
}
function eventRow(item) {
  const start = item.startDate, end = item.endDate || start;
  const range = start !== end;
  const sameMonth = start.slice(0,7) === end.slice(0,7);
  const days = label(start,{day:'numeric'}) + (range && sameMonth ? '–' + label(end,{day:'numeric'}) : '');
  const weekdays = label(start,{weekday:'short'}) + (range && sameMonth ? '–' + label(end,{weekday:'short'}) : '');
  const kind = /^business (opening|move|relocation)$/i.test(item.category) ? item.category : 'Event';
  const when = range && !sameMonth ? 'Through ' + label(end,{month:'short',day:'numeric'}) : '';
  const where = [when,item.listTime ?? item.time,item.listLocation || item.location].filter(Boolean).join(' · ');
  return '<a class="listing" data-kind="' + escape(kind) + '" href="' + sectionLink(item.id) + '"><time datetime="' +
    escape(start) + '" aria-label="' + escape(start + (range ? ' through ' + end : '')) + '"><small>' + weekdays +
    '</small><small class="date-month">' + label(start,{month:'short'}) + '</small><b' + (range ? ' class="wide"' : '') + '>' + days + '</b></time><span><strong>' + escape(item.shortTitle || item.title) + '</strong><span class="where">' + escape(where) + '</span></span></a>';
}
function months(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.startDate.slice(0,7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(eventRow(item));
  }
  return Array.from(groups, ([key,rows]) => '<section class="month"><h3>' +
    label(key+'-01',{month:'long'}) + '</h3>' + rows.join('') + '</section>').join('');
}
function detail(id,title,body,kind='') {
  return '<section class="page" id="' + escape(id) + '" data-share-kind="' + escape(kind) + '"><div class="page-actions"><a class="back" href="#feed">← Back to the front page</a><button class="share-button" type="button" data-share>Share</button></div><h2>' +
    escape(title) + '</h2>' + body + '</section>';
}
export function renderCommunity(data, today = chicagoDate()) {
  const now = Date.parse(today);
  const age = item => (now - Date.parse(item.date)) / dayMs;
  const published = data.news.filter(item => age(item) >= 0).sort((a,b)=>b.date.localeCompare(a.date));
  const features = published.filter(item => item.category === 'Did you know?');
  const latestFeature = features[0] || null; // Keep the most recent dated feature visible until the next daily update.
  const news = published.filter(item => item.category !== 'Did you know?' && age(item) <= 40);
  const limit = Math.max(3, Math.min(7, news.filter(item => age(item) < 7).length));
  const events = data.events.filter(item => (item.endDate || item.startDate) >= today)
    .sort((a,b)=>a.startDate.localeCompare(b.startDate));
  // Show all events through the end of next calendar month, capped at 25 visible rows.
  // Items outside that range remain available under See more events.
  const [thisYear,thisMonth] = today.slice(0,7).split('-').map(Number);
  const endOfNextMonth = new Date(Date.UTC(thisYear,thisMonth+1,0)).toISOString().slice(0,10);
  const count = Math.min(25, events.filter(item => item.startDate <= endOfNextMonth).length);
  // Exactly one Did You Know feature leads Local News; previous features remain in the archive.
  // Keep the latest visible until the next daily feature arrives, while normal news ages out.
  const headlines = latestFeature || news.length ? '<section aria-labelledby="news-heading"><h2 class="section-title" id="news-heading">Local news</h2>' +
    newsRows([...(latestFeature ? [latestFeature] : []), ...news.slice(0,limit)]) + more('news',newsRows(news.slice(limit))) + '</section>' : '';
  const listing = events.length ? '<section id="listings" aria-labelledby="listings-heading"><h2 class="section-title" id="listings-heading">Upcoming <a class="sports-shortcut" href="/sports.html" aria-label="Springville Tigers sports calendar" title="Springville Tigers sports calendar"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4"/></svg></a></h2>' +
    months(events.slice(0,count)) + more('events',months(events.slice(count))) + '</section>' : '';
  const details = published.map(item => {
    const feature = item.category === 'Did you know?';
    const credit = feature ? 'Did you know? · AI-written · ' : '';
    const paragraphs = [...new Set([item.summary,...(item.body || [])])].filter(Boolean).map(p=>'<p>'+escape(p)+'</p>').join('');
    const archiveLink = feature
      ? '<a class="feature-archive-link" href="#did-you-know-archive">More Did You Know stories <span aria-hidden="true">→</span></a>'
      : '';
    return detail(item.slug,item.title,'<small>'+credit+'Published '+label(item.date,{year:'numeric',month:'long',day:'numeric'})+
      '</small>'+paragraphs+sourceTrail(item)+archiveLink,'story');
  }).concat(events.map(item=>detail(item.id,item.title,'<p>'+escape([item.startDate,item.time,item.location].filter(Boolean).join(' · '))+
    '</p><p>'+escape(item.summary)+'</p>'+sourceLink(item.sourceUrl,item.sourceName || 'View event details'),'event'))).join('');
  const archive = detail('did-you-know-archive','Did You Know archive',features.length ? newsRows(features) : '<p>No features yet.</p>');
  return {feed:headlines + listing, details: details + archive};
}
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('can-share');
  const shareTimers = new WeakMap();
  document.addEventListener('click', async event => {
    const shareButton = event.target.closest('[data-share]');
    if (!shareButton) return;
    const page = shareButton.closest('.page') || document.querySelector('.page:target:not(#feed)');
    const home = document.querySelector('link[rel="canonical"]').href;
    const kind = page?.dataset?.shareKind;
    const url = kind === 'story' || kind === 'event'
      ? home.replace(/\/$/,'') + '/share/' + kind + '/' + encodeURIComponent(page.id)
      : page && page.id !== 'feed' ? home + '#' + encodeURIComponent(page.id) : home;
    const title = page?.querySelector('h2')?.textContent || document.title;
    try {
      if (navigator.share) {
        await navigator.share({title, url});
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      shareButton.textContent = 'Link copied';
      clearTimeout(shareTimers.get(shareButton));
      shareTimers.set(shareButton, setTimeout(() => { shareButton.textContent = shareButton.id === 'share-page' ? 'Share ↗' : 'Share'; }, 2000));
    } catch {
      window.prompt('Copy this link', url);
    }
  });
  async function refresh() {
    const response = await fetch('/data/content.json',{cache:'no-cache'});
    if (!response.ok) return;
    const page = renderCommunity(await response.json());
    document.getElementById('feed').innerHTML = page.feed;
    document.getElementById('entry-pages').innerHTML = page.details;
  }
  refresh().catch(() => { /* The published HTML includes a working snapshot. */ });
}

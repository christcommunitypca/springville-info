import {buildRecordIndex,recordLabel} from './sports-records.mjs?v=20261122-recordfix';
const escaped = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const secureUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
const dateText = value => new Intl.DateTimeFormat('en-US', {timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'})
  .format(new Date(value + 'T12:00:00Z'));
const ordinal = n => String(n) + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th'));
const query = new URLSearchParams(window.location.search);
const eventId = query.get('id') || '';
const backParams = new URLSearchParams();
for (const name of ['month','sport','gender']) {
  const val = query.get(name);
  if (val) backParams.set(name,val);
}
document.querySelector('#calendar-back').href = '/sports.html' + (backParams.size ? '?' + backParams.toString() : '');
const row = (label, value) => value ? '<span class="result-detail">' + escaped(label + ': ' + value) + '</span>' : '';
function teamPlacement(game) {
  const count = Number.isInteger(game.teamCount) ? ' · ' + (game.teamCountEstimated ? '~' : '') + game.teamCount + ' teams' : (game.teamDivision ? ' · ' + game.teamDivision : '');
  const points = Number.isInteger(game.teamScore) ? game.teamScore + ' team points' : '';
  return '<span class="result-strip"><strong class="result-box" aria-label="' +
    escaped(ordinal(game.teamPlace) + ' place' + (game.teamCount ? ' out of ' + (game.teamCountEstimated ? 'approximately ' : '') + game.teamCount + ' teams' : (game.teamDivision ? ' in ' + game.teamDivision : ''))) + '">' +
    escaped(game.teamPlace) + '</strong><span class="result-context">' + escaped('place' + count) +
    (points ? row('Score',points) : '') + (game.meetTotalTeams && game.teamDivision ? row('Meet size',game.meetTotalTeams + ' teams across all divisions') : '') + '</span></span>';
}
function teamScore(game, scoreA, scoreB, reported) {
  const margin = scoreA - scoreB;
  const outcome = margin > 0 ? 'W' : margin < 0 ? 'L' : 'T';
  const className = margin > 0 ? 'win' : margin < 0 ? 'loss' : 'tie';
  const order = game.site === 'home'
    ? [{name:game.opponent,score:scoreB},{name:'Springville',score:scoreA}]
    : [{name:'Springville',score:scoreA},{name:game.opponent,score:scoreB}];
  return '<div class="result-strip"><strong class="result-box ' + className + '" aria-label="' +
    escaped(margin > 0 ? 'Springville win' : margin < 0 ? 'Springville loss' : 'Tie') + '">' + outcome +
    '</strong><span class="score-lines">' + order.map(team =>
      '<span class="score-line ' + (team.score === Math.max(scoreA,scoreB) ? 'winner' : 'loser') + '">' +
      '<span class="score-points">' + escaped(team.score) + '</span><span>' + escaped(team.name) + '</span></span>').join('') +
    '</span></div>' +
    (game.sport === 'Volleyball' ? '<p class="note">Scores represent sets won, not individual set points.</p>' : '') +
    (reported ? '<p class="note">Reported score. Sources disagree or final verification remains open.</p>' : '');
}
function centralToday() {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return p.year + '-' + p.month + '-' + p.day;
}
function renderResult(game) {
  if (game.status === 'final') {
    if (Number.isInteger(game.teamPlace)) return teamPlacement(game);
    if (Number.isInteger(game.springvilleScore) && Number.isInteger(game.opponentScore))
      return teamScore(game,game.springvilleScore,game.opponentScore,false);
    return '<strong class="result-context">' + escaped(game.resultText || 'Results available') + '</strong>';
  }
  const reports = Array.isArray(game.scoreReports) ? game.scoreReports.filter(r =>
    Number.isInteger(r.springvilleScore) && Number.isInteger(r.opponentScore) && secureUrl(r.sourceUrl)) : [];
  if (reports.length) {
    const preferred = reports.find(r => r.sourceName === game.preferredScoreSourceName) || reports[0];
    return teamScore(game,preferred.springvilleScore,preferred.opponentScore,true) +
      '<p class="note">Displayed report: ' + escaped(preferred.sourceName) + '</p>';
  }
  if (game.status === 'scheduled' && game.date >= centralToday())
    return '<strong class="result-context">' + escaped(game.time || 'Time TBD') + '</strong>';
  return '<strong class="result-context">' + escaped(game.statusNote ||
    (game.status === 'scheduled' || game.status === 'unconfirmed' ? 'Result pending' : game.status)) + '</strong>';
}
function runnerList(entries, isPr) {
  return '<div class="runner-list">' + entries.map((r,i) =>
    '<div class="runner"><span class="' + (isPr ? 'pr' : 'rank') + '">' + (isPr ? 'PR' : i+1) + '</span>' +
    '<span class="runner-name">' + escaped(r.name) + '</span>' +
    '<span class="runner-stat">' + escaped(r.place ? ordinal(r.place) + ' overall · ' : '') +
      escaped(r.time || '') + '</span></div>').join('') + '</div>';
}
function section(title,content,note='') {
  return content ? '<section class="group"><h2>' + escaped(title) + '</h2>' +
    (note ? '<p class="subtext">' + escaped(note) + '</p>' : '') + content + '</section>' : '';
}
function items(list) {
  return '<ul class="extra-list">' + list.map(v=>'<li>' + escaped(v) + '</li>').join('') + '</ul>';
}
function playerSpotlights(game) {
  const entries = Array.isArray(game.playerHighlights) ? game.playerHighlights.slice(0,3) : [];
  if (!entries.length) return '';
  const body = '<div class="player-list">' + entries.map(p=>{
    const link = secureUrl(p.sourceUrl);
    const title = '<span class="player-name">' + escaped(p.name) + '</span>';
    return '<div class="player">' + (link ? '<a href="' + escaped(link) +
      '" target="_blank" rel="noopener noreferrer">' + title + '</a>' : title) +
      '<span class="player-stat">' + escaped(p.achievement) + '</span></div>';
  }).join('') + '</div>';
  return section('Player highlights',body,'Player performances from published results');
}
function sources(game) {
  const links = [
    [game.sourceName,game.sourceUrl],
    [game.secondarySourceName,game.secondarySourceUrl]
  ].filter(([name,url])=>name && secureUrl(url)).map(([name,url])=>
    '<p><a href="' + escaped(secureUrl(url)) + '" target="_blank" rel="noopener noreferrer">' +
    escaped(name) + ' ↗</a></p>').join('');
  // Editor-only provenance and research notes are never displayed to visitors.
  return '<div class="sources"><strong>Sources</strong>' + links + '</div>';
}
async function load() {
  const main = document.querySelector('#content');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventId)) {
    main.innerHTML = '<p class="state-message">No event selected. <a href="/sports.html">Browse the sports calendar.</a></p>';
    return;
  }
  try {
    const response = await fetch('/data/sports.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Sports data unavailable');
    const data = await response.json();
    const game = data.games.find(item => item.id === eventId);
    if (!game) {
      main.innerHTML = '<p class="state-message">This event was not found. <a href="/sports.html">Back to sports calendar.</a></p>';
      return;
    }
    const record = buildRecordIndex(data.games).get(game.id);
    const recordText = (record?.kind === 'through' || record?.kind === 'day_end') ? recordLabel(record) : '';
    const recordExtra = recordText ? '<div class="verified-record">' +
      'Overall: ' +
      '<strong>' + escaped(recordText) + '</strong></div>' : '';
    const competition = game.eventType === 'meet' || game.eventType === 'tournament' || game.eventType === 'news';
    const name = competition ? game.title : game.sport + ' ' + (game.venueUnconfirmed ? 'vs ' : game.site === 'away' ? '@ ' : 'vs ') + game.opponent + (game.gameNumber ? ' · Game ' + game.gameNumber : '');
    document.title = name + ' | Tigers Sports | Around Springville';
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://springville.info/sports-detail.html?id=' + encodeURIComponent(game.id);
    document.head.appendChild(canonical);
    const dateLine = dateText(game.date) + (game.time ? ' · ' + game.time : '') + (game.venueUnconfirmed ? ' · Venue TBD' : game.venue ? ' · ' + game.venue : '');
    const isXC = game.sport === 'Cross Country';
    const top = isXC && Array.isArray(game.topFinishers) && game.topFinishers.length
      ? section('Top 3 Springville finishers',runnerList(game.topFinishers.slice(0,3),false),
        'Springville team finishing order; placements are overall race positions') : '';
    const prs = isXC && Array.isArray(game.personalRecords) && game.personalRecords.length
      ? section('Personal records (' + game.personalRecords.length + ')',runnerList(game.personalRecords,true),
        'PRs reported in the meet results, including runners listed above') : '';
    const achievements = Array.isArray(game.specialAchievements) && game.specialAchievements.length
      ? section('Special achievements',items(game.specialAchievements)) : '';
    const general = Array.isArray(game.highlights) && game.highlights.length
      ? section('Additional highlights',items(game.highlights)) : '';
    main.innerHTML = '<article class="detail-shell">' +
      '<p class="category">' + escaped(game.sport + ' · ' + game.gender + ' ' + game.level + ' · ' + game.season) + '</p>' +
      '<div class="title-row"><div><h1>' + escaped(name) + '</h1><p class="when">' +
      escaped(dateLine) + '</p></div><button type="button" id="share" class="share">Share</button></div>' +
      '<div class="share-status" id="share-status" role="status" aria-live="polite"></div>' +
      '<div class="result-panel"><span class="result-label">' +
      escaped(competition ? 'Springville team result' : 'Springville game result') + '</span>' +
      renderResult(game) + recordExtra + '</div>' + top + prs + achievements + playerSpotlights(game) + general +
      sources(game) + '</article>';
    const button = document.querySelector('#share');
    button.addEventListener('click',async()=>{
      const url = 'https://springville.info/share/sport/' + encodeURIComponent(game.id);
      try {
        if (navigator.share) {
          await navigator.share({title:document.title,url});
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          document.querySelector('#share-status').textContent = 'Event link copied';
        } else {
          document.querySelector('#share-status').textContent = 'Share this link: ' + url;
        }
      } catch (error) {
        if (error.name !== 'AbortError')
          document.querySelector('#share-status').textContent = 'Share link: ' + url;
      }
    });
  } catch (error) {
    main.innerHTML = '<p class="state-message">The event details are unavailable right now. <a href="/sports.html">Back to sports calendar.</a></p>';
  }
}
load();

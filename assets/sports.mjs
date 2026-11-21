const $ = selector => document.querySelector(selector);
const escaped = text => String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
const chicagoNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return map.year + '-' + map.month + '-' + map.day;
};
const today = chicagoNow();
const shortDate = (day, options = {month:'short',day:'numeric'}) => new Intl.DateTimeFormat('en-US', {timeZone:'UTC',...options}).format(new Date(day + 'T12:00:00Z'));
const monthName = (year, month) => new Intl.DateTimeFormat('en-US', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));
let year = Number(today.slice(0,4));
let month = Number(today.slice(5,7)) - 1;
let games = [];
let mode = window.matchMedia('(max-width: 760px)').matches ? 'agenda' : 'calendar';
function resultLabel(game) {
  if (game.status === 'final') {
    if (Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore)) {
      const outcome = game.springvilleScore > game.opponentScore ? 'W' : game.springvilleScore < game.opponentScore ? 'L' : 'T';
      return '<span class="final-tag">Final</span><strong class="score">' + escaped(outcome) + ' · Springville ' + escaped(game.springvilleScore) + ' – ' + escaped(game.opponent) + ' ' + escaped(game.opponentScore) + '</strong>';
    }
    return '<span class="final-tag">Final</span><strong class="score">' + escaped(game.resultText || 'Result pending confirmation') + '</strong>';
  }
  if (game.status === 'cancelled' || game.status === 'postponed') return '<span class="status-tag">' + escaped(game.status) + '</span>';
  if (game.status === 'unconfirmed' || (game.status === 'scheduled' && game.date < today)) return '<span class="status-tag">Result not yet verified</span>';
  return '<span class="game-time">' + escaped(game.time || 'Time TBD') + '</span>';
}
function gameCard(game) {
  const at = game.site === 'away' ? '@' : game.site === 'neutral' ? 'vs (neutral)' : 'vs';
  const eventName = escaped(game.sport + ' · ' + game.gender + ' ' + game.level);
  const location = escaped(at + ' ' + game.opponent);
  const result = resultLabel(game);
  return '<a class="game' + (game.status === 'final' ? ' completed' : '') + '" target="_blank" rel="noopener noreferrer" href="' + escaped(safeUrl(game.sourceUrl)) + '" aria-label="' +
    escaped(game.date + ' ' + game.sport + ' ' + game.gender + ' Springville ' + at + ' ' + game.opponent + ' ' + (game.status === 'final' ? 'final result' : 'scheduled')) + '">' +
    '<span class="game-meta">' + eventName + '</span><strong class="matchup">' + location + '</strong><span class="game-result">' + result + '</span></a>';
}
function matchingGames() {
  const sport = $('#sport-filter').value, gender = $('#gender-filter').value, season = $('#season-filter').value;
  return games.filter(g => (sport === 'all' || g.sport === sport) &&
    (gender === 'all' || g.gender === gender) && (season === 'all' || g.season === season));
}
function render() {
  $('#month-label').textContent = monthName(year,month);
  const filtered = matchingGames();
  const prefix = year + '-' + String(month+1).padStart(2,'0') + '-';
  const current = filtered.filter(g => g.date.startsWith(prefix)).sort((a,b)=> a.date.localeCompare(b.date) ||
    (a.time||'').localeCompare(b.time||'') || a.opponent.localeCompare(b.opponent));
  $('#month-summary').textContent = current.length === 1 ? '1 verified contest' : current.length + ' verified contests';
  $('.view-calendar').setAttribute('aria-pressed', String(mode === 'calendar'));
  $('.view-agenda').setAttribute('aria-pressed', String(mode === 'agenda'));
  $('#month-grid').hidden = mode !== 'calendar';
  $('#agenda-list').hidden = mode !== 'agenda';
  const firstDay = new Date(Date.UTC(year,month,1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year,month+1,0)).getUTCDate();
  let cells = '';
  for (let i=0;i<firstDay;i++) cells += '<div class="calendar-gap" aria-hidden="true"></div>';
  for (let day=1;day<=daysInMonth;day++) {
    const key = prefix + String(day).padStart(2,'0');
    const events = current.filter(g=>g.date===key);
    cells += '<section class="calendar-day' + (key===today?' is-today':'') + '" aria-label="' + escaped(shortDate(key,{weekday:'long',month:'long',day:'numeric'})) + '">' +
      '<h3>' + day + (key===today?'<small>Today</small>':'') + '</h3>' +
      (events.length?events.map(gameCard).join(''):'') + '</section>';
  }
  $('#month-grid').innerHTML = cells;
  const dates = [...new Set(current.map(x=>x.date))];
  $('#agenda-list').innerHTML = dates.length ? dates.map(date => '<section class="agenda-day"><h3>' +
    escaped(shortDate(date,{weekday:'long',month:'long',day:'numeric'})) + '</h3>' +
    current.filter(g=>g.date===date).map(gameCard).join('') + '</section>').join('') :
    '<p class="empty">No verified contests are listed for this month and these filters. This calendar is being built out sport by sport; check the source calendars for additional games.</p>';
  $('#calendar-empty').hidden = current.length !== 0 || mode !== 'calendar';
}
function changeMonth(delta) { month += delta; while(month < 0){month += 12; year--;} while(month > 11){month -= 12;year++;} render(); }
const populate = (select, values, allLabel) => {
  select.innerHTML = '<option value="all">' + escaped(allLabel) + '</option>' +
    values.map(value=>'<option value="'+escaped(value)+'">'+escaped(value)+'</option>').join('');
};
async function start() {
  try {
    const response = await fetch('/data/sports.json',{cache:'no-cache'});
    if (!response.ok) throw new Error('Cannot load verified games');
    const data = await response.json();
    games = data.games.filter(g=>g && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && g.sport && g.gender && g.opponent && g.sourceUrl);
    const sports = [...new Set(games.map(g=>g.sport))].sort();
    const years = [...new Set(games.map(g=>g.season))].sort().reverse();
    populate($('#sport-filter'), sports, 'All sports');
    populate($('#season-filter'), years, 'All seasons');
    const activeSeason = years.find(s=>today >= s.slice(0,4)+'-07-01' && today <= ('20'+s.slice(-2))+'-06-30');
    $('#season-filter').value = activeSeason || 'all';
    const verifiedAt = data.school?.updatedAt;
    $('#data-updated').textContent = verifiedAt ? 'Scores and schedules checked ' + shortDate(verifiedAt,{month:'short',day:'numeric',year:'numeric'}) : 'Verified local schedules';
    render();
  } catch (error) {
    $('#data-updated').textContent = 'Schedule unavailable';
    $('#agenda-list').innerHTML = '<p class="empty">The sports calendar could not load. Please try again later.</p>';
    $('#month-grid').hidden = true;
  }
}
$('#prev-month').addEventListener('click',()=>changeMonth(-1));
$('#next-month').addEventListener('click',()=>changeMonth(1));
$('#current-month').addEventListener('click',()=>{year=Number(today.slice(0,4));month=Number(today.slice(5,7))-1;render();});
for (const id of ['sport-filter','gender-filter','season-filter']) $('#'+id).addEventListener('change',render);
$('.view-calendar').addEventListener('click',()=>{mode='calendar';render();});
$('.view-agenda').addEventListener('click',()=>{mode='agenda';render();});
start();

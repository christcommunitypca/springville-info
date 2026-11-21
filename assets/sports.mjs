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
let selectedSeason = null;
let selectedGender = 'all';
function resultLabel(game) {
  if (game.status === 'final') {
    if (Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore)) {
      const outcome = game.springvilleScore > game.opponentScore ? 'W' : game.springvilleScore < game.opponentScore ? 'L' : 'T';
      return '<span class="final-result"><strong class="outcome outcome-' + outcome.toLowerCase() + '" aria-label="' + (outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Tie') + '">' + outcome + '</strong><strong class="score">Springville ' + escaped(game.springvilleScore) + ' – ' + escaped(game.opponent) + ' ' + escaped(game.opponentScore) + '</strong></span>';
    }
    return '<strong class="score">' + escaped(game.resultText || 'Result pending confirmation') + '</strong>';
  }
  if (game.status === 'live' || game.status === 'in_progress') {
    const score = Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore)
      ? 'Springville ' + escaped(game.springvilleScore) + ' – ' + escaped(game.opponent) + ' ' + escaped(game.opponentScore)
      : 'Score being checked';
    return '<span class="live-result"><strong class="live-tag">LIVE</strong><strong class="score">' + score + '</strong></span>';
  }
  if (game.status === 'cancelled' || game.status === 'postponed') return '<span class="status-tag">' + escaped(game.status) + '</span>';
  if (game.status === 'unconfirmed' || (game.status === 'scheduled' && game.date < today)) return '<span class="status-tag">' + escaped(game.statusNote || 'Result not yet verified') + '</span>';
  return '<span class="game-time">' + escaped(game.time || 'Time TBD') + '</span>';
}
function reportedScoreCard(game) {
  const reports = game.scoreReports;
  if (!Array.isArray(reports) || reports.length < 1) return '';
  const valid = reports.filter(report => Number.isFinite(report.springvilleScore) &&
    Number.isFinite(report.opponentScore) && report.sourceUrl && report.sourceName);
  if (!valid.length) return '';

  // A source preference controls presentation only: other claims remain in the record
  // for later independent verification, without asserting the dispute is settled.
  const preferred = valid.find(report => report.sourceName === game.preferredScoreSourceName) || valid[0];
  const outcome = preferred.springvilleScore > preferred.opponentScore ? 'W' :
    preferred.springvilleScore < preferred.opponentScore ? 'L' : 'T';
  const sourceIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1 1-1V4a1 1 0 0 1 1-1h7"/></svg>';

  return '<article class="game preferred-score-game" aria-label="' +
    escaped(game.sport + ' ' + game.gender + ' vs ' + game.opponent + ', ' +
    preferred.sourceName + ' reported Springville ' + preferred.springvilleScore +
    ' to ' + preferred.opponentScore) + '">' +
    '<span class="game-meta">' + escaped(game.sport + ' · ' + game.gender + ' ' + game.level) +
    '</span><span class="final-result"><strong class="outcome outcome-' +
    outcome.toLowerCase() + '" aria-label="' +
    escaped(outcome === 'W' ? 'Reported win' : outcome === 'L' ? 'Reported loss' : 'Reported tie') +
    '">' + outcome + '</strong><span class="score-report"><strong class="score">Springville ' +
    escaped(preferred.springvilleScore) + ' – ' + escaped(game.opponent) + ' ' +
    escaped(preferred.opponentScore) + '</strong>' +
    '<a class="score-source" href="' + escaped(safeUrl(preferred.sourceUrl)) +
    '" target="_blank" rel="noopener noreferrer" title="Score reported by ' +
    escaped(preferred.sourceName) + '" aria-label="View ' + escaped(preferred.sourceName) +
    ' score report">' + sourceIcon + '</a></span></span></article>';
}
function gameCard(game) {
  const reportsCard = reportedScoreCard(game);
  if (reportsCard) return reportsCard;
  const at = game.site === 'away' ? '@' : game.site === 'neutral' ? 'vs (neutral)' : 'vs';
  const eventName = escaped(game.sport + ' · ' + game.gender + ' ' + game.level);
  const location = escaped(at + ' ' + game.opponent);
  const result = resultLabel(game);
  const scoreListed = (game.status === 'final' || game.status === 'live' || game.status === 'in_progress') &&
    Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore);
  return '<a class="game' + (game.status === 'final' ? ' completed' : '') + '" target="_blank" rel="noopener noreferrer" href="' + escaped(safeUrl(game.sourceUrl)) + '" aria-label="' +
    escaped(game.date + ' ' + game.sport + ' ' + game.gender + ' Springville ' + at + ' ' + game.opponent + ' ' + (game.status === 'final' ? 'final result' : 'scheduled')) + '">' +
    '<span class="game-meta">' + eventName + '</span>' + (scoreListed ? '' : '<strong class="matchup">' + location + '</strong>') +
    '<span class="game-result">' + result + '</span></a>';
}
function matchingGames() {
  const sport = $('#sport-filter').value, gender = selectedGender;
  return games.filter(g => (sport === 'all' || g.sport === sport) &&
    (gender === 'all' || g.gender === gender) && (selectedSeason === null || g.season === selectedSeason));
}
function render() {
  $('#month-label').textContent = monthName(year,month);
  $('.month-measure').textContent = 'September ' + year;
  const filtered = matchingGames();
  const prefix = year + '-' + String(month+1).padStart(2,'0') + '-';
  const current = filtered.filter(g => g.date.startsWith(prefix)).sort((a,b)=>a.date.localeCompare(b.date) ||
    (a.time||'').localeCompare(b.time||'') || a.opponent.localeCompare(b.opponent));

  const dates = [...new Set(current.map(x=>x.date))];
  $('#agenda-list').innerHTML = dates.length ? dates.map(date => '<section class="agenda-day"><h3>' +
    escaped(shortDate(date,{weekday:'long',month:'long',day:'numeric'})) + '</h3>' +
    current.filter(g=>g.date===date).map(gameCard).join('') + '</section>').join('') :
    '<p class="empty">No verified contests are listed for this month and these filters. This schedule is being built out sport by sport; check the source calendars for additional games.</p>';
}
function changeMonth(delta) { month += delta; while(month < 0){month += 12; year--;} while(month > 11){month -= 12;year++;} render(); }
const populate = (select, values, allLabel) => {
  select.innerHTML = (allLabel ? '<option value="all">' + escaped(allLabel) + '</option>' : '') +
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
    const seasonField = $('#season-field');
    if (years.length <= 1) {
      seasonField.hidden = true;
      selectedSeason = years[0] || null;
    } else {
      seasonField.hidden = false;
      populate($('#season-filter'), years, null);
      const activeSeason = years.find(s=>today >= s.slice(0,4)+'-07-01' && today <= ('20'+s.slice(-2))+'-06-30');
      selectedSeason = activeSeason || years[0];
      $('#season-filter').value = selectedSeason;
    }
    const updatedAt = data.school?.updatedAt;
    const time = updatedAt ? new Date(updatedAt) : null;
    if (time && !Number.isNaN(time.getTime())) {
      const hasTime = /^\d{4}-\d{2}-\d{2}T/.test(updatedAt);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone:'America/Chicago', month:'short', day:'numeric',
        ...(hasTime ? {hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'} : {})
      });
      let label = formatter.format(time);
      if (hasTime) label = label.replace(' AM', ' am').replace(' PM', ' pm');
      $('#data-updated').textContent = 'Last updated ' + label;
    } else {
      $('#data-updated').textContent = '';
    }
    render();
  } catch (error) {
    $('#data-updated').textContent = 'Schedule unavailable';
    $('#agenda-list').innerHTML = '<p class="empty">The sports calendar could not load. Please try again later.</p>';
  }
}
$('#prev-month').addEventListener('click',()=>changeMonth(-1));
$('#next-month').addEventListener('click',()=>changeMonth(1));
$('#current-month').addEventListener('click',()=>{year=Number(today.slice(0,4));month=Number(today.slice(5,7))-1;render();});
$('#sport-filter').addEventListener('change',render);
const genderSlider=$('#gender-slider');
const genderStops=['Boys','all','Girls'];
function setGenderStop(index) {
  const stop=Math.max(0,Math.min(2,Math.round(Number(index))));
  genderSlider.value=String(stop);
  selectedGender=genderStops[stop];
  genderSlider.setAttribute('aria-valuetext',selectedGender==='all'?'Both':selectedGender);
  document.querySelectorAll('.gender-stop').forEach(label=>{
    if(Number(label.dataset.stop)===stop) label.setAttribute('aria-current','true');
    else label.removeAttribute('aria-current');
  });
  render();
}
genderSlider.addEventListener('input',()=>setGenderStop(genderSlider.value));
document.querySelectorAll('.gender-stop').forEach(label=>{
  label.addEventListener('click',()=>{setGenderStop(label.dataset.stop);genderSlider.focus({preventScroll:true});});
});
$('#season-filter').addEventListener('change',event=>{selectedSeason=event.target.value;render();});
start();

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

function formattedScore(game, springvilleScore, opponentScore) {
  // Away team first, home team second. Neutral-site fixtures retain Springville first.
  const teams = game.site === 'home'
    ? [{name:game.opponent,points:opponentScore},{name:'Springville',points:springvilleScore}]
    : [{name:'Springville',points:springvilleScore},{name:game.opponent,points:opponentScore}];
  const winningScore = Math.max(springvilleScore, opponentScore);
  const tied = springvilleScore === opponentScore;
  return '<span class="score-lines">' + teams.map(team => {
    const emphasis = tied ? 'score-tie' : team.points === winningScore ? 'score-winner' : 'score-loser';
    return '<span class="score-line ' + emphasis + '"><span class="score-points">' +
      escaped(team.points) + '</span><span class="score-team-name">' +
      escaped(team.name) + '</span></span>';
  }).join('') + '</span>';
}
function outcomeBadge(springvilleScore, opponentScore) {
  const margin = springvilleScore - opponentScore;
  const outcome = margin > 0 ? 'W' : margin < 0 ? 'L' : 'T';
  const label = outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Tie';
  return '<strong class="outcome outcome-' + outcome.toLowerCase() +
    '" aria-label="' + label + '">' + outcome + '</strong>';
}
function resultLabel(game) {
  if (game.status === 'final') {
    if (Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore)) {
      return '<span class="final-result">' + outcomeBadge(game.springvilleScore, game.opponentScore) +
        '<span class="score">' + formattedScore(game, game.springvilleScore, game.opponentScore) + '</span></span>';
    }
    return '<strong class="score">' + escaped(game.resultText || 'Result pending confirmation') + '</strong>';
  }
  if (game.status === 'live' || game.status === 'in_progress') {
    const score = Number.isFinite(game.springvilleScore) && Number.isFinite(game.opponentScore)
      ? formattedScore(game, game.springvilleScore, game.opponentScore)
      : 'Score being checked';
    return '<span class="live-result"><strong class="live-tag">LIVE</strong><span class="score">' + score + '</span></span>';
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

  // Preserve competing reports in the data while showing the preferred source's score.
  // Like other completed games, the entire card links to the source; no extra link icon.
  const preferred = valid.find(report => report.sourceName === game.preferredScoreSourceName) || valid[0];
  return '<a class="game completed preferred-score-game" target="_blank" rel="noopener noreferrer" href="' +
    escaped(safeUrl(preferred.sourceUrl)) + '" aria-label="' +
    escaped(game.sport + ' ' + game.gender + ' vs ' + game.opponent + ', ' +
      preferred.sourceName + ' reports Springville ' + preferred.springvilleScore +
      ' to ' + preferred.opponentScore + '; view source') + '">' +
    '<span class="game-meta">' + escaped(game.sport + ' · ' + game.gender + ' ' + game.level) +
    '</span><span class="game-result"><span class="final-result">' +
    outcomeBadge(preferred.springvilleScore, preferred.opponentScore) +
    '<span class="score">' +
    formattedScore(game, preferred.springvilleScore, preferred.opponentScore) + '</span></span></span></a>';
}
function competitionCard(game) {
  const finished = game.status === 'final';
  const title = game.title || game.opponent;
  const kind = game.eventType === 'news' ? 'Team news' :
    game.eventType === 'tournament' ? 'Tournament' : 'Meet';
  const status = finished
    ? '<strong class="meet-summary">' + escaped(game.resultText || 'Results available') + '</strong>'
    : game.status === 'scheduled' && game.date >= today
      ? '<span class="game-time">' + escaped(game.time || 'Time TBD') + '</span>'
      : '<span class="status-tag">' + escaped(game.statusNote || (game.status === 'scheduled' || game.status === 'unconfirmed' ? 'Results not yet verified' : game.status)) + '</span>';
  const highlights = Array.isArray(game.highlights) ?
    game.highlights.slice(0,4).map(item => '<span class="meet-highlight">' + escaped(item) + '</span>').join('') : '';
  return '<a class="game competition-card' + (finished ? ' completed' : '') +
    '" target="_blank" rel="noopener noreferrer" href="' + escaped(safeUrl(game.sourceUrl)) +
    '" aria-label="' + escaped(game.sport + ' ' + game.gender + ' ' + kind + ': ' + title + ', view source') + '">' +
    '<span class="game-meta">' + escaped(game.sport + ' · ' + game.gender + ' ' + game.level + ' · ' + kind) + '</span>' +
    '<strong class="meet-title">' + escaped(title) + '</strong>' +
    (game.venue ? '<span class="meet-venue">' + escaped(game.venue) + '</span>' : '') +
    '<span class="game-result">' + status + '</span>' +
    (highlights ? '<span class="meet-highlights">' + highlights + '</span>' : '') + '</a>';
}
function gameCard(game) {
  if (game.eventType === 'meet' || game.eventType === 'tournament' || game.eventType === 'news') return competitionCard(game);
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
    '<span class="game-result">' + result + '</span>' +
    (game.sport === 'Volleyball' && scoreListed ? '<span class="set-caption">Score shown in sets won</span>' : '') +
    (Array.isArray(game.highlights) && game.highlights.length ? '<span class="meet-highlights">' + game.highlights.slice(0,4).map(s=>'<span class="meet-highlight">' + escaped(s) + '</span>').join('') + '</span>' : '') +
    '</a>';
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
    (a.time||'').localeCompare(b.time||'') || (a.opponent || a.title || '').localeCompare(b.opponent || b.title || ''));

  const dates = [...new Set(current.map(x=>x.date))];
  $('#agenda-list').innerHTML = dates.length ? dates.map(date => '<section class="agenda-day"><h3>' +
    escaped(shortDate(date,{weekday:'long',month:'long',day:'numeric'})) + '</h3>' +
    current.filter(g=>g.date===date).map(gameCard).join('') + '</section>').join('') :
    '<p class="empty">No verified ' + escaped($('#sport-filter').value === 'all' ? 'contests' : $('#sport-filter').value + ' events') + ' listed for this month and these filters. New schedules and results are added as they are confirmed.</p>';
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
    games = data.games.filter(g=>g && /^\d{4}-\d{2}-\d{2}$/.test(g.date) && g.sport && g.gender && (g.opponent || g.title) && g.sourceUrl);
    const sports = [...new Set([...(Array.isArray(data.sportsCatalog) ? data.sportsCatalog.filter(s=>typeof s==='string') : []),...games.map(g=>g.sport)])].sort();
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

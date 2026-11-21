// Cumulative, date-correct records from definitive or source-agreed Springville varsity outcomes.
// A disputed exact score may still have an agreed winner; conflicting winners are excluded.
const WIN_LOSS_SPORTS = new Set([
  'Baseball', 'Basketball', 'Flag Football', 'Football', 'Golf',
  'Soccer', 'Softball', 'Tennis', 'Volleyball'
]);
const keyFor = game => [game.season,game.sport,game.gender,game.level].join('|');
const numericFinal = game => game.status === 'final' &&
  Number.isInteger(game.springvilleScore) && Number.isInteger(game.opponentScore) &&
  game.eventType !== 'meet' && game.eventType !== 'tournament';
// The final score can be disputed even when multiple separately named sources
// agree which team won. Use that agreed outcome for W-L, not an invented score.
function resultOutcome(game) {
  const outcome = (a,b) => {
    const d = game.sport === 'Golf' ? b - a : a - b;
    return d > 0 ? 'W' : d < 0 ? 'L' : 'T';
  };
  if(numericFinal(game))return outcome(game.springvilleScore,game.opponentScore);
  if(game.status !== 'unconfirmed' || !Array.isArray(game.scoreReports))return null;
  const reports = game.scoreReports.filter(r=>Number.isInteger(r.springvilleScore) &&
    Number.isInteger(r.opponentScore) && r.sourceName && r.sourceUrl);
  const sources = new Set(reports.map(r=>r.sourceName.trim().toLowerCase()));
  if(reports.length < 2 || sources.size < 2)return null;
  const outcomes = new Set(reports.map(r=>outcome(r.springvilleScore,r.opponentScore)));
  return outcomes.size === 1 ? [...outcomes][0] : null;
}
const copy = x => ({wins:x.wins,losses:x.losses,ties:x.ties,played:x.played});
export function buildRecordIndex(allGames) {
  const groups = new Map();
  for(const game of allGames) {
    if(!WIN_LOSS_SPORTS.has(game.sport) || !game.id) continue;
    const key = keyFor(game);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(game);
  }
  const results = new Map();
  for(const entries of groups.values()) {
    entries.sort((a,b)=>a.date.localeCompare(b.date) || (a.gameNumber||0)-(b.gameNumber||0) ||
      (a.time||'').localeCompare(b.time||'') || a.id.localeCompare(b.id));
    const record={wins:0,losses:0,ties:0,played:0};
    const dates=[...new Set(entries.map(game=>game.date))].sort();
    for(const date of dates) {
      const todays = entries.filter(game=>game.date===date);
      const before=copy(record);
      // Same-date doubleheaders: the card shows the end-of-day record; individual
      // ordering cannot be claimed if scheduled start times are unpublished.
      for(const game of todays) {
        const outcome = resultOutcome(game);
        if(outcome === null)continue;
        if(outcome === 'W')record.wins++;
        else if(outcome === 'L')record.losses++;
        else record.ties++;
        record.played++;
      }
      const after=copy(record);
      for(const game of todays) {
        if(resultOutcome(game) !== null) results.set(game.id,{...after,kind:'through'});
        else if(['scheduled','unconfirmed','live','in_progress'].includes(game.status)) {
          results.set(game.id,{...before,kind:'entering'});
        }
      }
    }
  }
  return results;
}
export function recordLabel(record) {
  if(!record)return '';
  return record.wins+'–'+record.losses+(record.ties?'–'+record.ties:'');
}

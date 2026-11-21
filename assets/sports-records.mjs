// Cumulative, date-correct records from verified Springville varsity results.
// No external scoreboard claim: games without definitive numeric finals are excluded.
const WIN_LOSS_SPORTS = new Set([
  'Baseball', 'Basketball', 'Flag Football', 'Football', 'Golf',
  'Soccer', 'Softball', 'Tennis', 'Volleyball'
]);
const keyFor = game => [game.season,game.sport,game.gender,game.level].join('|');
const numericFinal = game => game.status === 'final' &&
  Number.isInteger(game.springvilleScore) && Number.isInteger(game.opponentScore) &&
  game.eventType !== 'meet' && game.eventType !== 'tournament';
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
        if(!numericFinal(game))continue;
        const diff=game.springvilleScore-game.opponentScore;
        const wins = game.sport === 'Golf' ? diff < 0 : diff > 0;
        const losses = game.sport === 'Golf' ? diff > 0 : diff < 0;
        if(wins)record.wins++;
        else if(losses)record.losses++;
        else record.ties++;
        record.played++;
      }
      const after=copy(record);
      for(const game of todays) {
        if(numericFinal(game)) results.set(game.id,{...after,kind:'through'});
        else if(game.status === 'scheduled' && before.played > 0) results.set(game.id,{...before,kind:'entering'});
      }
    }
  }
  return results;
}
export function recordLabel(record) {
  if(!record||record.played<1)return '';
  return record.wins+'–'+record.losses+(record.ties?'–'+record.ties:'');
}

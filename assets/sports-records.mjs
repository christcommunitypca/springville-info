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
// Confirmed schedule times used ONLY for ordering records in the UI.
// Source: MaxPreps Oct. 27, 2026 Alabama girls flag football scoreboard:
// Gadsden City at 4:30 PM; J.B. Pennington at 6:00 PM.
// These do not overwrite editorial data or published game details.
const VERIFIED_START_TIMES = new Map([
  ['2026-10-27-flag-football-girls-gadsden-city','4:30 PM'],
  ['2026-10-27-flag-football-girls-j-b-pennington','6:00 PM']
]);
function minutesSinceMidnight(game) {
  const value = game.time || VERIFIED_START_TIMES.get(game.id);
  if (!value || typeof value !== 'string') return null;
  const match = /^([0-9]{1,2})(?::([0-9]{2}))?[ ]*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2] || 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute;
}
// The same ordering is used in both the list and the record calculation.
export function compareSportsGames(a,b) {
  const dateOrder = a.date.localeCompare(b.date);
  if (dateOrder) return dateOrder;
  const tA = minutesSinceMidnight(a), tB = minutesSinceMidnight(b);
  if (tA !== null && tB !== null && tA !== tB) return tA - tB;
  if (Number.isInteger(a.gameNumber) && Number.isInteger(b.gameNumber) &&
      a.gameNumber !== b.gameNumber) return a.gameNumber - b.gameNumber;
  return (a.opponent || a.title || '').localeCompare(b.opponent || b.title || '') ||
    a.id.localeCompare(b.id);
}
function hasConfirmedOrder(played) {
  if (played.length <= 1) return true;
  const times = played.map(minutesSinceMidnight);
  if (times.every(time => time !== null) && new Set(times).size === times.length) return true;
  const numbers = played.map(game => game.gameNumber);
  return numbers.every(Number.isInteger) && new Set(numbers).size === numbers.length;
}
const copy = x => ({wins:x.wins,losses:x.losses,ties:x.ties,played:x.played});
function applyResult(record, outcome) {
  if (outcome === 'W') record.wins++;
  else if (outcome === 'L') record.losses++;
  else if (outcome === 'T') record.ties++;
  else return;
  record.played++;
}
export function buildRecordIndex(allGames) {
  const groups = new Map();
  for (const game of allGames) {
    if (!WIN_LOSS_SPORTS.has(game.sport) || !game.id) continue;
    const key = keyFor(game);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  }
  const results = new Map();
  for (const entries of groups.values()) {
    entries.sort(compareSportsGames);
    const record={wins:0,losses:0,ties:0,played:0};
    const dates=[...new Set(entries.map(game=>game.date))].sort();
    for (const date of dates) {
      const todays = entries.filter(game=>game.date===date).sort(compareSportsGames);
      const played = todays.filter(game=>resultOutcome(game) !== null);
      const before = copy(record);
      if (hasConfirmedOrder(played)) {
        // Each reliably sequenced final advances the record exactly once.
        for (const game of todays) {
          const outcome = resultOutcome(game);
          if (outcome !== null) {
            applyResult(record,outcome);
            results.set(game.id,{...copy(record),kind:'through'});
          } else if (['scheduled','unconfirmed','live','in_progress'].includes(game.status)) {
            results.set(game.id,{...before,kind:'entering'});
          }
        }
      } else {
        // Without trustworthy same-day times/order, do not invent interim W-L figures.
        // Show the true day-end tally once, beside the day's last completed listing.
        for (const game of played) applyResult(record,resultOutcome(game));
        const lastPlayed = played[played.length-1];
        results.set(lastPlayed.id,{...copy(record),kind:'day_end'});
        for (const game of todays) {
          if (['scheduled','unconfirmed','live','in_progress'].includes(game.status)) {
            results.set(game.id,{...before,kind:'entering'});
          }
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

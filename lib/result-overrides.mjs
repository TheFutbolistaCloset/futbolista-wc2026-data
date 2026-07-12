// Manual result overrides — applied on EVERY build (local + CI refresh), so a
// correction survives the 5-min openfootball refresh that would otherwise
// overwrite a hand-edited public/wc2026-data.json.
//
// Why this exists: openfootball logs some extra-time knockout games at their
// 90-minute score (e.g. a 1-1 draw) even though the tie was decided in extra
// time. That renders as a "1-1 finished" in the bracket with a winner advancing
// out of a draw, which looks broken. Each entry below pins the real full result
// (incl. extra time). Verified vs ESPN / Sky / Al Jazeera + confirmed by Gal.
//
// Matching is by stage + both team codes (NOT by positional id), so a reorder of
// openfootball's matches array can't make an override land on the wrong game.
// Score is [t1, t2] in the feed's team order. Remove an entry once upstream
// openfootball reports the correct full-time score on its own.

export const RESULT_OVERRIDES = [
  // QF: England beat Norway 2-1 after extra time (openfootball logged 1-1).
  { stage: 'qf', t1: 'NOR', t2: 'ENG', score: [1, 2], note: 'ENG 2-1 NOR (AET)' },
  // QF: Argentina beat Switzerland 3-1 after extra time (openfootball logged 1-1).
  { stage: 'qf', t1: 'ARG', t2: 'SUI', score: [3, 1], note: 'ARG 3-1 SUI (AET)' },
];

// Mutates feed.matches in place; returns the feed for chaining.
export function applyResultOverrides(feed) {
  if (!feed || !Array.isArray(feed.matches)) return feed;
  for (const ov of RESULT_OVERRIDES) {
    const m = feed.matches.find(
      (x) => x.stage === ov.stage && x.t1 === ov.t1 && x.t2 === ov.t2
    );
    if (!m) continue; // teams not resolved yet / reordered — skip, never guess
    m.score = ov.score.slice();
    m.status = 'finished';
    m.minute = null;
  }
  return feed;
}

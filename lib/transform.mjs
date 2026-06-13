// Pure transform: openfootball raw (+ optional API-Football live overlay) →
// the normalized feed the storefront renders. No I/O, so it's easy to test and
// to reuse for the sample feed. All times are converted to Israel local time
// (Asia/Jerusalem, DST-correct) from openfootball's "HH:MM UTC±N" stadium time.

import { TEAMS, ISO, lookupTeam, displayHe, flagOf, shortHe } from './teams.mjs';
import { venueHe } from './venues.mjs';

const IL_TZ = 'Asia/Jerusalem';
const GROUP_LETTERS = 'ABCDEFGHIJKL';

// ── Time ─────────────────────────────────────────────────────────────────
// "13:00 UTC-6" + "2026-06-11"  →  epoch ms of the kickoff instant.
function kickoffMs(date, timeStr) {
  if (!date || !timeStr) return null;
  const m = String(timeStr).match(/^(\d{1,2}):(\d{2})\s*UTC\s*([+-]\d{1,2})/i);
  if (!m) return null;
  const [, hh, mm, off] = m;
  const [y, mo, d] = date.split('-').map(Number);
  // local = UTC + offset  ⇒  UTC = local - offset
  return Date.UTC(y, mo - 1, d, Number(hh) - Number(off), Number(mm));
}

const ilDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IL_TZ, day: '2-digit', month: '2-digit', year: 'numeric',
});
const ilTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IL_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
});
const ilDowFmt = new Intl.DateTimeFormat('he-IL', { timeZone: IL_TZ, weekday: 'long' });

// epoch ms → Israel display fields.
function ilFields(ms) {
  if (ms == null) return { date_il: '', dow_he: '', time_il: '', date_key: '' };
  const dt = new Date(ms);
  const [dd, MM, yyyy] = ilDateFmt.format(dt).split('/'); // en-GB → DD/MM/YYYY
  return {
    date_il: `${dd}.${MM}`,
    date_key: `${yyyy}-${MM}-${dd}`,           // sortable Israel-day key
    dow_he: ilDowFmt.format(dt),               // e.g. "יום שישי"
    time_il: ilTimeFmt.format(dt),             // "22:00"
  };
}

// "now" → Israel YYYY-MM-DD key (for is_today / is_tomorrow).
function ilDayKey(ms) {
  const [dd, MM, yyyy] = ilDateFmt.format(new Date(ms)).split('/');
  return `${yyyy}-${MM}-${dd}`;
}
function addDaysKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  const p = (x) => String(x).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

// ── Stage ────────────────────────────────────────────────────────────────
function stageOf(match) {
  if (match.group) return { stage: 'group', group: match.group.replace(/^Group\s+/i, '').trim() };
  const r = String(match.round || '').toLowerCase();
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('third')) return { stage: 'final', group: null };
  if (r.includes('third')) return { stage: 'third', group: null };
  if (r.includes('semi')) return { stage: 'sf', group: null };
  if (r.includes('quarter')) return { stage: 'qf', group: null };
  if (r.includes('16')) return { stage: 'r16', group: null };
  if (r.includes('32')) return { stage: 'r32', group: null };
  return { stage: 'ko', group: null };
}

function ft(score) {
  if (score && Array.isArray(score.ft) && score.ft.length === 2) return score.ft;
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────
// opts: { now = Date.now(), live = [] }  where live is an API-Football overlay
// keyed loosely by team names (applied later; empty for the sample).
export function transform(raw, opts = {}) {
  const now = opts.now ?? Date.now();
  const liveByPair = indexLive(opts.live || []);
  const todayKey = ilDayKey(now);
  const tomorrowKey = addDaysKey(todayKey, 1);

  const matches = (raw.matches || []).map((mm, i) => {
    const ms = kickoffMs(mm.date, mm.time);
    const il = ilFields(ms);
    const { stage, group } = stageOf(mm);
    const t1 = mm.team1, t2 = mm.team2;
    const finished = ft(mm.score);

    // Live overlay (API-Football) takes precedence when present.
    const lk = liveKey(t1, t2);
    const live = liveByPair.get(lk);

    let status = 'scheduled', score = null, minute = null;
    if (live) { status = 'live'; score = live.score; minute = live.minute; }
    else if (finished) { status = 'finished'; score = finished; }

    return {
      id: `m${String(i + 1).padStart(3, '0')}`,
      ts: ms,
      kickoff_utc: ms == null ? null : new Date(ms).toISOString(),
      ...il,
      stage, group,
      t1: keyOf(t1), t2: keyOf(t2),
      t1_he: displayHe(t1), t2_he: displayHe(t2),
      t1_short: shortHe(lookupTeam(t1)?.code, displayHe(t1)), t2_short: shortHe(lookupTeam(t2)?.code, displayHe(t2)),
      t1_flag: flagOf(t1), t2_flag: flagOf(t2),
      t1_iso: lookupTeam(t1)?.iso || null, t2_iso: lookupTeam(t2)?.iso || null,
      venue: mm.ground || '', venue_he: venueHe(mm.ground),
      status, score, minute,
      is_today: il.date_key === todayKey,
      is_tomorrow: il.date_key === tomorrowKey,
    };
  });

  matches.sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity));

  return {
    updated: new Date(now).toISOString(),
    tz: IL_TZ,
    source: 'openfootball + api-football',
    tournament: { teams: 48, matches: matches.length, groups: 12, start: '2026-06-11', final: '2026-07-19' },
    teams: teamsBlock(),
    matches,
    groups: standings(matches),
  };
}

// FIFA code (BRA, ARG…) for known teams, or the raw placeholder token (1A, W74…).
// Codes keep matches and the teams[] block on the SAME key, so jersey lookups
// and the team filter line up.
function keyOf(name) {
  const t = lookupTeam(name);
  return t ? t.code : String(name || '').trim();
}

function teamsBlock() {
  const out = {};
  for (const [key, t] of Object.entries(TEAMS)) {
    out[t.code] = { key, he: t.he, heShort: shortHe(t.code, t.he), flag: t.flag, iso: ISO[t.code] || null, group: groupOfTeam(key) };
  }
  return out;
}

// ── Standings ─────────────────────────────────────────────────────────────
let _groupCache = null;
function groupOfTeam(key) {
  return _groupCache?.get(key) || null;
}

function standings(matches) {
  const groups = {};
  _groupCache = new Map();

  // seed group membership from group-stage fixtures
  for (const m of matches) {
    if (m.stage !== 'group' || !m.group) continue;
    groups[m.group] = groups[m.group] || {};
    for (const code of [m.t1, m.t2]) {
      const t = lookupTeam(code);
      if (!t) continue;
      _groupCache.set(t.key, m.group);
      groups[m.group][t.code] = groups[m.group][t.code] || row(t);
    }
  }

  // accumulate finished results
  let playedByGroup = {};
  for (const m of matches) {
    if (m.stage !== 'group' || !m.group || m.status !== 'finished' || !m.score) continue;
    const a = lookupTeam(m.t1), b = lookupTeam(m.t2);
    if (!a || !b) continue;
    const ra = groups[m.group][a.code], rb = groups[m.group][b.code];
    const [ga, gb] = m.score;
    ra.p++; rb.p++; ra.gf += ga; ra.ga += gb; rb.gf += gb; rb.ga += ga;
    if (ga > gb) { ra.w++; rb.l++; ra.pts += 3; }
    else if (ga < gb) { rb.w++; ra.l++; rb.pts += 3; }
    else { ra.d++; rb.d++; ra.pts++; rb.pts++; }
    playedByGroup[m.group] = (playedByGroup[m.group] || 0) + 1;
  }

  // sort + status per group
  const out = {};
  for (const g of Object.keys(groups).sort()) {
    const rows = Object.values(groups[g]).map((r) => ({ ...r, gd: r.gf - r.ga }));
    rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.he.localeCompare(y.he, 'he'));
    const complete = (playedByGroup[g] || 0) >= 6; // 4 teams → 6 group matches
    rows.forEach((r, i) => {
      r.pos = i + 1;
      if ((playedByGroup[g] || 0) === 0) r.status = 'not-started';
      else if (complete) r.status = i < 2 ? 'qualified' : i === 2 ? 'third-pending' : 'eliminated';
      else r.status = i < 2 ? 'advancing' : i === 2 ? 'third-watch' : 'trailing';
    });
    out[g.replace(/^Group\s+/i, '')] = { complete, standings: rows };
  }
  return out;
}

function row(t) {
  return { code: t.code, team: t.key, he: t.he, flag: t.flag, iso: t.iso, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

// ── Live overlay matching (used once API-Football is wired) ────────────────
function liveKey(a, b) {
  const ka = lookupTeam(a)?.code || a, kb = lookupTeam(b)?.code || b;
  return [ka, kb].sort().join('|');
}
function indexLive(live) {
  const m = new Map();
  for (const ev of live) {
    const ka = lookupTeam(ev.home)?.code, kb = lookupTeam(ev.away)?.code;
    if (!ka || !kb) continue;
    m.set([ka, kb].sort().join('|'), { score: ev.score, minute: ev.minute });
  }
  return m;
}

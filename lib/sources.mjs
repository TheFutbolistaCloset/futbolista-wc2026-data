// Data sources for the WC2026 feed.
//  • openfootball/worldcup.json — free, no key: full 104-match schedule, groups,
//    venues, kickoff times (HH:MM UTC±N), and results (refreshed ~daily).
//  • API-Football (api-sports.io) — free tier: live in-match scores only.
//
// Every network call has a hard timeout + bounded retries with backoff, so a
// stalled endpoint degrades gracefully instead of hanging an unattended job
// (per the CLI timeout+retry lesson). openfootball falls back to a local cache.

import { readFileSync, existsSync } from 'fs';

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const APIFOOTBALL_BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE_ID = 1; // FIFA World Cup
const WC_SEASON = 2026;

export async function fetchWithRetry(url, { timeout = 12000, retries = 3, headers = {}, method = 'GET' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { method, headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(500 * attempt); // 0.5s, 1s backoff
    }
  }
  throw new Error(`fetch failed after ${retries} attempts: ${lastErr?.message || lastErr}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns the openfootball raw object; falls back to a local cache file on failure.
export async function getOpenfootball({ cacheFile } = {}) {
  try {
    const res = await fetchWithRetry(OPENFOOTBALL_URL, { timeout: 12000, retries: 3 });
    return await res.json();
  } catch (err) {
    if (cacheFile && existsSync(cacheFile)) {
      console.warn(`openfootball fetch failed (${err.message}); using cache ${cacheFile}`);
      return JSON.parse(readFileSync(cacheFile, 'utf8'));
    }
    throw err;
  }
}

// Returns a live overlay: [{ home, away, score:[h,a], minute }]. Empty when no
// key (so the build still works) or when nothing is live right now.
export async function getLive({ apiKey } = {}) {
  if (!apiKey) return [];
  const url = `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&live=all`;
  try {
    const res = await fetchWithRetry(url, { timeout: 10000, retries: 2, headers: { 'x-apisports-key': apiKey } });
    const data = await res.json();
    return (data.response || []).map((f) => ({
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      score: [f.goals?.home ?? 0, f.goals?.away ?? 0],
      minute: f.fixture?.status?.elapsed ?? null,
    })).filter((e) => e.home && e.away);
  } catch (err) {
    console.warn(`API-Football live fetch failed (${err.message}); continuing without live overlay`);
    return [];
  }
}

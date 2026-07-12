#!/usr/bin/env node
// Build the WC2026 feed: openfootball (+ optional API-Football live overlay)
// → transform → write public/wc2026-data.json. Does NOT push to Shopify.
// Publishing = `git commit && git push` of public/ (separate step / launchd).
//
// Flags:
//   --offline           use the cached data/openfootball-2026.json (no network)
//   --now <ISO>         pin "now" (for the sample/preview; default = real now)
//   --out <path>        output file (default public/wc2026-data.json)
//   --pretty            pretty-print the JSON
//
// Env: APIFOOTBALL_KEY (optional — live scores; without it the feed is
// schedule+results only, which is correct outside live match windows).

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getOpenfootball, getLive } from './lib/sources.mjs';
import { transform } from './lib/transform.mjs';
import { jerseyUrl, HAS_JERSEY } from './lib/jersey.mjs';
import { applyResultOverrides } from './lib/result-overrides.mjs';
import { renderSSR } from './lib/ssr.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const val = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

const OFFLINE = flag('--offline');
const NOW = val('--now') ? Date.parse(val('--now')) : Date.now();
const OUT = val('--out', `${ROOT}/public/wc2026-data.json`);
const PRETTY = flag('--pretty');
const CACHE = `${ROOT}/data/openfootball-2026.json`;

// Load .env (APIFOOTBALL_KEY) so manual + cron + deploy-ssr runs all pick it up.
const ENV = `${ROOT}/.env`;
if (existsSync(ENV)) {
  for (const line of readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const raw = OFFLINE
    ? JSON.parse(readFileSync(CACHE, 'utf8'))
    : await getOpenfootball({ cacheFile: CACHE });

  // Live overlay (API-Football) — DORMANT by default (LIVE_API='on' to enable).
  // The free plan blocks the 2026 season ("Free plans do not have access to this
  // season"), so every call just errors and would burn quota for nothing. The
  // feed runs on openfootball alone (free). Re-enable with a paid plan: set
  // LIVE_API=on in .env. When on, it still only calls WITHIN a match window so a
  // paid quota isn't wasted by the cron. getLive() degrades to [] on error.
  let live = [];
  let feed = transform(raw, { now: NOW, live });
  const KEY = process.env.APIFOOTBALL_KEY;
  if (!OFFLINE && KEY && process.env.LIVE_API === 'on') {
    const WIN = 150 * 60000; // ~90 min + half-time + stoppage
    const inWindow = feed.matches.some(
      (m) => m.ts && m.status !== 'finished' && NOW >= m.ts - 5 * 60000 && NOW <= m.ts + WIN
    );
    if (inWindow) {
      live = await getLive({ apiKey: KEY });
      if (live.length) feed = transform(raw, { now: NOW, live });
    }
  }

  // Manual result overrides (extra-time knockout scores openfootball logs as the
  // 90' draw). Applied after the final transform so it wins over the feed value.
  applyResultOverrides(feed);

  // Wire per-team jersey deep-links for the teams that have shirts. checkLive
  // (online builds) HEADs /collections/wc2026-<slug>: 200 ⇒ the branded
  // collection, else ⇒ the always-200 search URL. Auto-upgrades the moment the
  // collections are published. Offline builds skip the HEAD (search only).
  const checkLive = !OFFLINE;
  for (const code of HAS_JERSEY) {
    const t = feed.teams[code];
    if (!t) continue;
    t.jersey = { has: true, url: await jerseyUrl(code, t.he, { checkLive }), he: t.he };
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed, null, PRETTY ? 2 : 0));

  // Server-rendered SEO layer: three theme snippets the crawler can read as HTML.
  // (Schedule + tables + SportsEvent JSON-LD; deployed to the theme separately.)
  const OUT_DIR = dirname(OUT);
  const ssr = renderSSR(feed, { allJerseysUrl: process.env.SSR_ALL_JERSEYS_URL });
  writeFileSync(`${OUT_DIR}/wc2026-schedule-ssr.liquid`, ssr.schedule);
  writeFileSync(`${OUT_DIR}/wc2026-standings-ssr.liquid`, ssr.standings);
  writeFileSync(`${OUT_DIR}/wc2026-jsonld.liquid`, ssr.jsonld);

  const today = feed.matches.filter((m) => m.is_today).length;
  const live_n = feed.matches.filter((m) => m.status === 'live').length;
  const done = feed.matches.filter((m) => m.status === 'finished').length;
  const jerseys = Object.values(feed.teams).filter((t) => t.jersey?.has).length;
  console.log(`✓ ${OUT}`);
  console.log(`  + wc2026-{schedule,standings,jsonld}-ssr.liquid`);
  console.log(`  matches=${feed.matches.length} finished=${done} live=${live_n} today=${today} groups=${Object.keys(feed.groups).length} jerseys=${jerseys}`);
  console.log(`  updated=${feed.updated}  now=${new Date(NOW).toISOString()}`);
}

main().catch((e) => { console.error('BUILD FAILED:', e.message); process.exit(1); });
